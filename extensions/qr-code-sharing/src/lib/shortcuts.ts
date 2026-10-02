import { Keyboard } from "@raycast/api";

/** ⌃E. Raycast has no common shortcut for editing in place, so it is spelled out per platform. */
export const EDIT_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["ctrl"], key: "e" },
  Windows: { modifiers: ["ctrl"], key: "e" },
};

/** ⌃P. Raycast's common pin shortcut is ⌘⇧P, so this one is spelled out per platform. */
export const PIN_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["ctrl"], key: "p" },
  Windows: { modifiers: ["ctrl"], key: "p" },
};

/** ⌃X — Raycast's common shortcut for removing an item. */
export const DELETE_SHORTCUT: Keyboard.Shortcut = Keyboard.Shortcut.Common.Remove;
