import { Keyboard } from "@raycast/api";

/** ⌘ on macOS, Ctrl on Windows, plus any extra modifiers. */
export function primaryShortcut(key: Keyboard.KeyEquivalent, extra: Keyboard.KeyModifier[] = []): Keyboard.Shortcut {
  return {
    macOS: { modifiers: ["cmd", ...extra], key },
    Windows: { modifiers: ["ctrl", ...extra], key },
  };
}
