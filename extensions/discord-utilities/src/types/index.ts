// Shared types for the Discord Utilities extension (folder index)
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

export interface Preferences {
  preferredFlavor: InstallFlavor;
  stablePath?: string; // optional override to Update.exe or Discord.exe
  ptbPath?: string;
  canaryPath?: string;
}
