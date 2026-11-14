import type { Keyboard } from "@raycast/api";

export const generateAndPasteShortcut: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "return" },
  Windows: { modifiers: ["ctrl", "shift"], key: "return" },
};

export const generateAnotherShortcut: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: "g" },
  Windows: { modifiers: ["ctrl"], key: "g" },
};

export const copyBicShortcut: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "b" },
  Windows: { modifiers: ["ctrl", "shift"], key: "b" },
};
