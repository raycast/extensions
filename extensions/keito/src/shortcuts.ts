import { Keyboard } from "@raycast/api";

/** ⌘ on macOS, plus any extra modifiers (Raycast 1.x shortcut format). */
export function primaryShortcut(key: Keyboard.KeyEquivalent, extra: Keyboard.KeyModifier[] = []): Keyboard.Shortcut {
  return {
    modifiers: ["cmd", ...extra],
    key,
  };
}
