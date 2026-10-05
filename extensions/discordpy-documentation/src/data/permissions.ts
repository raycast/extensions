// Generated from discord.py v2.7.1 discord/permissions.py.
// Discord never reassigns a permission bit, so these values only ever grow.
// Regenerate from discord/permissions.py when discord.py adds new flags.

export interface PermissionFlag {
  name: string;
  bit: number;
  description: string;
}

export const PERMISSIONS: PermissionFlag[] = [
  {
    name: "create_instant_invite",
    bit: 0,
    description: "The user can create instant invites",
  },
  {
    name: "kick_members",
    bit: 1,
    description: "The user can kick users from the guild",
  },
  {
    name: "ban_members",
    bit: 2,
    description: "A user can ban users from the guild",
  },
  { name: "administrator", bit: 3, description: "A user is an administrator" },
  {
    name: "manage_channels",
    bit: 4,
    description: "A user can edit, delete, or create channels in the guild",
  },
  {
    name: "manage_guild",
    bit: 5,
    description: "A user can edit guild properties",
  },
  {
    name: "add_reactions",
    bit: 6,
    description: "A user can add reactions to messages",
  },
  {
    name: "view_audit_log",
    bit: 7,
    description: "A user can view the guild's audit log",
  },
  {
    name: "priority_speaker",
    bit: 8,
    description: "A user can be more easily heard while talking",
  },
  {
    name: "stream",
    bit: 9,
    description: "A user can stream in a voice channel",
  },
  {
    name: "read_messages",
    bit: 10,
    description: "A user can read messages from all or specific text channels",
  },
  {
    name: "send_messages",
    bit: 11,
    description: "A user can send messages from all or specific text channels",
  },
  {
    name: "send_tts_messages",
    bit: 12,
    description:
      "A user can send TTS messages from all or specific text channels",
  },
  {
    name: "manage_messages",
    bit: 13,
    description: "A user can delete messages in a text channel",
  },
  {
    name: "embed_links",
    bit: 14,
    description: "A user's messages will automatically be embedded by Discord",
  },
  {
    name: "attach_files",
    bit: 15,
    description: "A user can send files in their messages",
  },
  {
    name: "read_message_history",
    bit: 16,
    description: "A user can read a text channel's previous messages",
  },
  {
    name: "mention_everyone",
    bit: 17,
    description:
      "A user's @everyone or @here will mention everyone in the text channel",
  },
  {
    name: "external_emojis",
    bit: 18,
    description: "A user can use emojis from other guilds",
  },
  {
    name: "view_guild_insights",
    bit: 19,
    description: "A user can view the guild's insights",
  },
  {
    name: "connect",
    bit: 20,
    description: "A user can connect to a voice channel",
  },
  {
    name: "speak",
    bit: 21,
    description: "A user can speak in a voice channel",
  },
  { name: "mute_members", bit: 22, description: "A user can mute other users" },
  {
    name: "deafen_members",
    bit: 23,
    description: "A user can deafen other users",
  },
  {
    name: "move_members",
    bit: 24,
    description: "A user can move users between other voice channels",
  },
  {
    name: "use_voice_activation",
    bit: 25,
    description: "A user can use voice activation in voice channels",
  },
  {
    name: "change_nickname",
    bit: 26,
    description: "A user can change their nickname in the guild",
  },
  {
    name: "manage_nicknames",
    bit: 27,
    description: "A user can change other user's nickname in the guild",
  },
  {
    name: "manage_roles",
    bit: 28,
    description:
      "A user can create or edit roles less than their role's position",
  },
  {
    name: "manage_webhooks",
    bit: 29,
    description: "A user can create, edit, or delete webhooks",
  },
  {
    name: "manage_expressions",
    bit: 30,
    description:
      "A user can edit or delete emojis, stickers, and soundboard sounds",
  },
  {
    name: "use_application_commands",
    bit: 31,
    description: "A user can use slash commands",
  },
  {
    name: "request_to_speak",
    bit: 32,
    description: "A user can request to speak in a stage channel",
  },
  {
    name: "manage_events",
    bit: 33,
    description: "A user can manage guild events",
  },
  { name: "manage_threads", bit: 34, description: "A user can manage threads" },
  {
    name: "create_public_threads",
    bit: 35,
    description: "A user can create public threads",
  },
  {
    name: "create_private_threads",
    bit: 36,
    description: "A user can create private threads",
  },
  {
    name: "external_stickers",
    bit: 37,
    description: "A user can use stickers from other guilds",
  },
  {
    name: "send_messages_in_threads",
    bit: 38,
    description: "A user can send messages in threads",
  },
  {
    name: "use_embedded_activities",
    bit: 39,
    description: "A user can launch an embedded application in a Voice channel",
  },
  {
    name: "moderate_members",
    bit: 40,
    description: "A user can time out other members",
  },
  {
    name: "view_creator_monetization_analytics",
    bit: 41,
    description: "A user can view role subscription insights",
  },
  {
    name: "use_soundboard",
    bit: 42,
    description: "A user can use the soundboard",
  },
  {
    name: "create_expressions",
    bit: 43,
    description: "A user can create emojis, stickers, and soundboard sounds",
  },
  {
    name: "create_events",
    bit: 44,
    description: "A user can create guild events",
  },
  {
    name: "use_external_sounds",
    bit: 45,
    description: "A user can use sounds from other guilds",
  },
  {
    name: "send_voice_messages",
    bit: 46,
    description: "A user can send voice messages",
  },
  {
    name: "set_voice_channel_status",
    bit: 48,
    description: "A user can set voice channel status",
  },
  { name: "send_polls", bit: 49, description: "A user can send poll messages" },
  {
    name: "use_external_apps",
    bit: 50,
    description: "A user can use external apps",
  },
  { name: "pin_messages", bit: 51, description: "A user can pin messages" },
  {
    name: "bypass_slowmode",
    bit: 52,
    description: "A user can bypass slowmode",
  },
];
