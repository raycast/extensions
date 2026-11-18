import { Keyboard } from "@raycast/api";

// Shortcuts are declared per platform even though the manifest currently ships macOS only, so
// adding Windows back is a one-line change rather than an audit of every Action. A bare `cmd`
// binding is ambiguous there, and Raycast has no way to guess the equivalent. Most actions use
// Keyboard.Shortcut.Common, which already carries both platforms; these three have no Common
// equivalent and spell it out.
//
// Not `as const satisfies`: Keyboard.Shortcut wants a mutable KeyModifier[], which a readonly
// tuple doesn't satisfy. Plain `satisfies` still contextually types the modifiers.
export const SHORTCUTS = {
  toggleDetail: {
    macOS: { modifiers: ["cmd"], key: "d" },
    Windows: { modifiers: ["ctrl"], key: "d" },
  },
  toggleFavorite: {
    macOS: { modifiers: ["cmd"], key: "f" },
    Windows: { modifiers: ["ctrl"], key: "f" },
  },
  resetRanking: {
    macOS: { modifiers: ["cmd", "shift"], key: "backspace" },
    Windows: { modifiers: ["ctrl", "shift"], key: "backspace" },
  },
} satisfies Record<string, Keyboard.Shortcut>;
