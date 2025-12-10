// Shared types for the Discord Utilities extension
// Strict-mode friendly definitions

export type InstallFlavor = "stable" | "ptb" | "canary";

export type PinType = "server" | "channel" | "dm";

export interface PinnedLink {
  id: string;
  name: string;
  type: PinType;
  link: string; // must start with "discord://"
  tags?: string[];
}

export interface Bookmark {
  id: string;
  name: string;
  // Deep link to a specific message or thread
  // Examples:
  //  - Guild message: discord://-/channels/<guild_id>/<channel_id>/<message_id>
  //  - DM message:    discord://-/channels/@me/<dm_channel_id>/<message_id>
  link: string;
  tags?: string[];
}

export interface Preferences {
  preferredFlavor: InstallFlavor;
  stablePath?: string; // optional override to Update.exe or Discord.exe
  ptbPath?: string;
  canaryPath?: string;
}
