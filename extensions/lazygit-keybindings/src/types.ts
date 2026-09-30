export interface Keybinding {
  action: string;
  shortcut: string;
  context?: string;
  category?: string;
  info?: string;
  locale: string;
  path: string;
}

export interface Preferences {
  locale: string;
  useCache: boolean;
  cacheTTLMinutes: string;
}
