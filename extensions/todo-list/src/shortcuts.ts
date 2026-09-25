import type { Keyboard } from "@raycast/api";

export function shortcut(key: Keyboard.KeyEquivalent, modifiers: Keyboard.KeyModifier[]): Keyboard.Shortcut {
  return {
    macOS: { key, modifiers },
    windows: {
      key,
      modifiers: modifiers.map((modifier) => (modifier === "cmd" ? "ctrl" : modifier === "opt" ? "alt" : modifier)),
    },
  };
}
