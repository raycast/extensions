import { Keyboard } from "@raycast/api";

// Cross-platform shortcuts.
//
// Raycast on Windows ignores shortcuts whose modifier is `cmd`, and Raycast on
// macOS ignores shortcuts whose modifier is `windows`. The SDK exposes two ways
// to handle this:
//
// 1. Re-use the `Keyboard.Shortcut.Common.*` set when one exists — they
//    automatically map to the right modifiers per platform.
// 2. Otherwise, declare a per-platform shortcut with the `{ macOS, Windows }`
//    syntax introduced in @raycast/api 1.98.
//
// We also avoid the keys reserved by Raycast (⌘K, ⌘W, ⌘Esc, …) which would be
// silently dropped at runtime.
//
// References:
// - https://developers.raycast.com/api-reference/keyboard
// - https://developers.raycast.com/misc/changelog

export const refreshShortcut: Keyboard.Shortcut = Keyboard.Shortcut.Common.Refresh;

export const killAllShortcut: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "k" },
  Windows: { modifiers: ["ctrl", "shift"], key: "k" },
};

export const toggleDetailShortcut: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "d" },
  Windows: { modifiers: ["ctrl", "shift"], key: "d" },
};

// ⌘O / Ctrl+O is the platform-standard "Open" combo and is what Raycast
// recommends via `Keyboard.Shortcut.Common.Open` for cross-platform binding.
export const openInBrowserShortcut: Keyboard.Shortcut = Keyboard.Shortcut.Common.Open;
