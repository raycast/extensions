import type { Keyboard } from "@raycast/api";

/**
 * Creates a platform-aware shortcut using Command on macOS and Control on Windows.
 */
export function commandOrControlShortcut(key: Keyboard.KeyEquivalent): Keyboard.Shortcut {
  return {
    macOS: {
      modifiers: ["cmd"],
      key,
    },
    windows: {
      modifiers: ["ctrl"],
      key,
    },
  };
}
