import type { Keyboard } from "@raycast/api";

export const shortcuts = {
  copyImage: {
    macOS: { modifiers: ["cmd"], key: "c" },
    Windows: { modifiers: ["ctrl"], key: "c" },
  },
  switchTheme: {
    macOS: { modifiers: ["cmd"], key: "t" },
    Windows: { modifiers: ["ctrl"], key: "t" },
  },
  compare: {
    macOS: { modifiers: ["cmd", "shift"], key: "v" },
    Windows: { modifiers: ["ctrl", "shift"], key: "v" },
  },
  reset: {
    macOS: { modifiers: ["cmd", "shift"], key: "r" },
    Windows: { modifiers: ["ctrl", "shift"], key: "r" },
  },
} satisfies Record<string, Keyboard.Shortcut>;
