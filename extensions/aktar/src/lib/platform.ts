import { Keyboard } from "@raycast/api";

export const isWindows = process.platform === "win32";

/** What the user calls the system file manager. */
export const FILE_MANAGER = isWindows ? "File Explorer" : "Finder";

/**
 * A shortcut with ⌘ on macOS and Ctrl on Windows. Raycast needs both
 * spelled out for shortcuts with cmd, ctrl or windows in them.
 */
export function primaryShortcut(key: Keyboard.KeyEquivalent, ...more: Keyboard.KeyModifier[]): Keyboard.Shortcut {
  return {
    macOS: { modifiers: ["cmd", ...more], key },
    Windows: { modifiers: ["ctrl", ...more], key },
  };
}
