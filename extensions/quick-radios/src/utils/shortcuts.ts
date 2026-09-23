import { Keyboard } from "@raycast/api";

/**
 * Creates a platform-safe Raycast shortcut that explicitly maps keys and modifiers
 * for both Windows and macOS to avoid OS-level conflicts and unmapped keys.
 */
export function createPlatformShortcut(
  macModifiers: Keyboard.KeyModifier[],
  winModifiers: Keyboard.KeyModifier[],
  key: Keyboard.KeyEquivalent,
): Keyboard.Shortcut {
  return {
    macOS: { modifiers: macModifiers, key },
    Windows: { modifiers: winModifiers, key },
  };
}

export const SHORTCUTS = {
  /** Toggle Wi-Fi radio (Cmd+T on Mac, Ctrl+T on Windows) */
  toggleRadio: createPlatformShortcut(["cmd"], ["ctrl"], "t"),

  /** Open OS settings (Cmd+O on Mac, Ctrl+O on Windows) */
  openSettings: createPlatformShortcut(["cmd"], ["ctrl"], "o"),

  /** Refresh list and trigger hardware scan (Cmd+R on Mac, Ctrl+R on Windows) */
  refresh: createPlatformShortcut(["cmd"], ["ctrl"], "r"),

  /** Copy IP or MAC address (Cmd+C on Mac, Ctrl+C on Windows) */
  copyDetails: createPlatformShortcut(["cmd"], ["ctrl"], "c"),

  /** Copy Wi-Fi password (Cmd+Shift+P on Mac, Ctrl+Shift+P on Windows) */
  copyPassword: createPlatformShortcut(
    ["cmd", "shift"],
    ["ctrl", "shift"],
    "p",
  ),

  /** Run internet speed test (Cmd+Shift+S on Mac, Ctrl+Shift+S on Windows) */
  testSpeed: createPlatformShortcut(["cmd", "shift"], ["ctrl", "shift"], "s"),
} as const;
