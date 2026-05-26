import type { Application } from "@raycast/api";

export type TerminalType =
  | "ghostty"
  | "iterm"
  | "terminal"
  | "warp"
  | "kitty"
  | "alacritty"
  | "wezterm";

export type CommandMode = "none" | "commandOnly" | "keepShell";

export type ReuseSupport =
  | "none"
  | "bestEffort"
  | "requiresUserSetup"
  | "supported";

export interface ExtensionPreferences {
  vscodeApp?: Application;
  projectManagerDataPath?: string;
  terminalType: TerminalType;
  defaultCommand?: string;
  commandMode?: CommandMode;
  reuseWindow?: boolean;
  shellPath?: string;
  groupProjectsByTag?: boolean;
  hideProjectsWithoutTag?: boolean;
  hideProjectsNotEnabled?: boolean;
}

export interface ProjectEntry {
  id?: string;
  name?: string;
  rootPath?: string;
  paths?: string[];
  tags?: string[];
  enabled?: boolean;
  profile?: string;
}

export interface CachedProjectEntry {
  name: string;
  fullPath: string;
}

export interface NormalizedProject {
  id: string;
  name: string;
  rootPath: string;
  cwd: string;
  tags: string[];
  enabled: boolean;
  isRemote: boolean;
  exists: boolean;
  isWorkspaceFile: boolean;
}

export interface StorageResolution {
  storagePath: string;
  projectsJsonPath: string;
  isDefault: boolean;
  error?: string;
}
