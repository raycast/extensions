export interface Script {
  name: string;
  requiresPrompt: boolean;
  command: string;
  filePath: string;
  isJSONFolder?: boolean; // if script is located within the scripts.json folder
  type?: string;
  id?: string;
  kenv?: string;
  icon?: string;
  menu?: string;
  description?: string;
  author?: string;
  twitter?: string;
  note?: string;
  exclude?: boolean;
  shortcut?: string;
  friendlyShortcut?: string;
  tabs?: string[];
}

export interface Preferences {
  scriptsListJsonPath: string;
  shell: "bash" | "zsh";
  terminalApp: "terminal" | "warp";
}
