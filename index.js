require('dotenv').config();
const { Client, GatewayIntentBits, PermissionsBitField, ChannelType, SlashCommandBuilder, REST, Routes, EmbedBuilder } = require('discord.js');
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID || '1557806762495574096';
const GUILD_ID = process.env.GUILD_ID || '1556073166399348768';
if (!TOKEN) { console.error('Missing DISCORD_TOKEN. Add it in Railway Variables.'); process.exit(1); }
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const duty = new Set();
const commands = [
 new SlashCommandBuilder().setName('setup').setDescription('Set up the London Central staff/police system.').setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
 new SlashCommandBuilder().setName('clockin').setDescription('Clock yourself on duty.'),
 new SlashCommandBuilder().setName('clockout').setDescription('Clock yourself off duty.'),
 new SlashCommandBuilder().setName('onduty').setDescription('Show officers currently on duty.'),
 new SlashCommandBuilder().setName('staff').setDescription('Staff management.')
  .addSubcommand(s=>s.setName('note').setDescription('Add a staff note.').addUserOption(o=>o.setName('user').setDescription('Staff member').setRequired(true)).addStringOption(o=>o.setName('note').setDescription('Note').setRequired(true)))
  .addSubcommand(s=>s.setName('promote').setDescription('Record a promotion.').addUserOption(o=>o.setName('user').setDescription('Staff member').setRequired(true)).addStringOption(o=>o.setName('rank').setDescription('New rank').setRequired(true)))
  .addSubcommand(s=>s.setName('demote').setDescription('Record a demotion.').addUserOption(o=>o.setName('user').setDescription('Staff member').setRequired(true)).addStringOption(o=>o.setName('rank').setDescription('New rank').setRequired(true))),
 new SlashCommandBuilder().setName('clear').setDescription('Delete 1-100 messages.').addIntegerOption(o=>o.setName('amount').setDescription('Amount').setRequired(true).setMinValue(1).setMaxValue(100)).setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages)
].map(c=>c.toJSON());
const embed=(title,description)=>new EmbedBuilder().setTitle(title).setDescription(description).setColor(0x123b68).setTimestamp().setFooter({text:'London Central RP • Staff System'});
async function setupGuild(guild){
 const roles=['London Central | Owner','London Central | Management','London Central | Head Staff','London Central | Senior Staff','London Central | Staff','London Central | Moderator','London Central | Police Command','London Central | Police','London Central | On Duty'];
 for(const name of roles) if(!guild.roles.cache.find(r=>r.name===name)) await guild.roles.create({name,reason:'London Central bot setup'});
 let cat=guild.channels.cache.find(c=>c.type===ChannelType.GuildCategory&&c.name==='LONDON CENTRAL • STAFF');
 if(!cat) cat=await guild.channels.create({name:'LONDON CENTRAL • STAFF',type:ChannelType.GuildCategory});
 const channels=[['staff-dashboard','Staff dashboard'],['staff-logs','Staff action logs'],['police-duty','Police duty activity'],['applications','Application alerts'],['ticket-logs','Ticket activity logs']];
 for(const [name,topic] of channels) if(!guild.channels.cache.find(c=>c.name===name&&c.parentId===cat.id)) await guild.channels.create({name,type:ChannelType.GuildText,parent:cat.id,topic,permissionOverwrites:[{id:guild.roles.everyone.id,deny:[PermissionsBitField.Flags.ViewChannel]}]});
}
client.once('ready',async()=>{console.log(`Logged in as ${client.user.tag}`);try{const rest=new REST({version:'10'}).setToken(TOKEN);await rest.put(Routes.applicationGuildCommands(CLIENT_ID,GUILD_ID),{body:commands});console.log('Slash commands registered.')}catch(e){console.error(e)}});
client.on('interactionCreate',async i=>{if(!i.isChatInputCommand())return;try{
 if(i.commandName==='setup'){await i.deferReply({ephemeral:true});await setupGuild(i.guild);return i.editReply({embeds:[embed('🚔 London Central Setup Complete','Roles, staff category, logs, applications and police-duty channels have been created/checked.')]});}
 if(i.commandName==='clockin'){duty.add(i.user.id);const c=i.guild.channels.cache.find(c=>c.name==='police-duty');if(c)await c.send({embeds:[embed('🟢 Officer Clocked In',`${i.user} is now **ON DUTY**.`)]});return i.reply({embeds:[embed('🟢 Clocked In','You are now marked **ON DUTY**.')],ephemeral:true});}
 if(i.commandName==='clockout'){duty.delete(i.user.id);const c=i.guild.channels.cache.find(c=>c.name==='police-duty');if(c)await c.send({embeds:[embed('🔴 Officer Clocked Out',`${i.user} is now **OFF DUTY**.`)]});return i.reply({embeds:[embed('🔴 Clocked Out','You are now marked **OFF DUTY**.')],ephemeral:true});}
 if(i.commandName==='onduty'){const list=[...duty].map(id=>`<@${id}>`);return i.reply({embeds:[embed('🚔 Officers On Duty',list.length?list.join('\n'):'No officers are currently on duty.')]});}
 if(i.commandName==='staff'){if(!i.member.permissions.has(PermissionsBitField.Flags.ManageGuild))return i.reply({content:'❌ You need Manage Server.',ephemeral:true});const sub=i.options.getSubcommand(),user=i.options.getUser('user'),value=i.options.getString(sub==='note'?'note':'rank'),logs=i.guild.channels.cache.find(c=>c.name==='staff-logs');if(logs)await logs.send({embeds:[embed(`📋 Staff ${sub}`,`**User:** ${user}\n**Details:** ${value}\n**Action by:** ${i.user}`)]});return i.reply({embeds:[embed(`✅ Staff ${sub}`,`${user} has been processed.\n**Details:** ${value}`)],ephemeral:true});}
 if(i.commandName==='clear'){const n=i.options.getInteger('amount');await i.channel.bulkDelete(n,true);return i.reply({content:`🧹 Deleted ${n} messages.`,ephemeral:true});}
 }catch(e){console.error(e);if(i.replied||i.deferred)return i.editReply({content:'❌ Something went wrong. Check Railway logs.'});return i.reply({content:'❌ Something went wrong. Check Railway logs.',ephemeral:true});}});
client.login(TOKEN);
