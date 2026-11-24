import { Keyboard } from "@raycast/api";

export const DASHBOARD_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: "d" },
  Windows: { modifiers: ["ctrl"], key: "d" },
};

export const OPEN_USAGE_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: "u" },
  Windows: { modifiers: ["ctrl"], key: "u" },
};

export const SHARE_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "s" },
  Windows: { modifiers: ["ctrl", "shift"], key: "s" },
};
