import type { Keyboard } from "@raycast/api";

type MacModifier = "cmd" | "opt" | "shift";

const WINDOWS_EQUIVALENT: Record<MacModifier, Keyboard.KeyModifier> = { cmd: "ctrl", opt: "alt", shift: "shift" };

export function crossPlatformShortcut(modifiers: MacModifier[], key: Keyboard.KeyEquivalent): Keyboard.Shortcut {
  return {
    macOS: { modifiers, key },
    Windows: { modifiers: modifiers.map((modifier) => WINDOWS_EQUIVALENT[modifier]), key },
  };
}
