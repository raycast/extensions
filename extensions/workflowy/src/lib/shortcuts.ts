import type { Keyboard } from "@raycast/api";

export function platformShortcut(modifiers: Keyboard.KeyModifier[], key: Keyboard.KeyEquivalent): Keyboard.Shortcut {
  const windowsModifiers = modifiers.map((modifier) => {
    if (modifier === "cmd") return "ctrl";
    if (modifier === "opt") return "alt";
    return modifier;
  });

  return {
    macOS: { modifiers, key },
    Windows: { modifiers: windowsModifiers, key },
  };
}
