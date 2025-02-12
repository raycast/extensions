import { Keyboard } from "@raycast/api";

export const secondaryActionShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "enter" };
export const tertiaryActionShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "o" };

export const refreshShortcut = Keyboard.Shortcut.Common.Refresh;
export const copyShortcut = Keyboard.Shortcut.Common.Copy;
export const deleteShortcut: Keyboard.Shortcut = { modifiers: ["cmd"], key: "backspace" };

export const drilldownShortcut: Keyboard.Shortcut = { modifiers: [], key: "tab" };
