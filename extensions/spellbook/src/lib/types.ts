export type RunMode = "inline" | "terminal";

export type TerminalApp = Preferences["terminalApp"];

export interface SavedCommand {
  id: string;
  name: string;
  template: string;
  keywords: string[];
  runMode: RunMode;
  cwd?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Library {
  version: 1;
  commands: SavedCommand[];
}
