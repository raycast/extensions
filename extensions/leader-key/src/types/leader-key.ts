export interface LeaderKeyAction {
  key: string;
  label?: string;
  type: "application" | "url" | "group" | "command";
  value?: string;
  actions?: LeaderKeyAction[];
  iconPath?: string;
}

export type LeaderKeyConfig = LeaderKeyAction;

export interface ShortcutItem {
  alias: string;
  value: string;
  label?: string;
  type: "application" | "url" | "command";
}
