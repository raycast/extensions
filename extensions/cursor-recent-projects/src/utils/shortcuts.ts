import { Keyboard } from "@raycast/api";

const WINDOWS_MODIFIERS: Partial<Record<Keyboard.KeyModifier, Keyboard.KeyModifier>> = {
  cmd: "ctrl",
  opt: "alt",
};

export function shortcut(modifiers: Keyboard.KeyModifier[], key: Keyboard.KeyEquivalent): Keyboard.Shortcut {
  return {
    macOS: { modifiers, key },
    Windows: { modifiers: modifiers.map((modifier) => WINDOWS_MODIFIERS[modifier] ?? modifier), key },
  };
}
