export type RunMode = "inline" | "terminal";

export type TerminalApp = "Terminal" | "iTerm";

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

export interface SpellbookPreferences {
  libraryPath?: string;
  terminalApp?: TerminalApp;
}
