export interface Hotkey {
  key: string;
  shellCommand: string;
}

export interface Preferences {
  hyperkey?: string;
  skhdPath: string;
  showHotkeys: boolean;
  yabaiPath?: string;
}

export interface ExecResult {
  error: boolean;
  detail: string;
}

export interface Command {
  title: string;
  description: string;
  key?: string;
  shellCommand: string;
  parameters?: string[];
}
