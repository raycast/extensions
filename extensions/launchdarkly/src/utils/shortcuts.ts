import { Keyboard } from "@raycast/api";

/** Shortcuts shared across views so the same key does the same thing everywhere. */
export const SWITCH_PROJECT_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "s" };
export const TOGGLE_NAME_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "t" };
export const RECENT_CHANGES_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "l" };
export const FLAG_HISTORY_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "h" };
