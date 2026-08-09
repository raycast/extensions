import type { Keyboard } from "@raycast/api";

/**
 * Declared per platform: the extension ships for macOS and Windows, and a bare "cmd" shortcut is
 * ambiguous on Windows.
 */
export const OPEN_IN_BROWSER: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: "return" },
  Windows: { modifiers: ["ctrl"], key: "return" },
};

export const COPY_PHONE: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "p" },
  Windows: { modifiers: ["ctrl", "shift"], key: "p" },
};

/** Matches the system-wide Quick Look shortcut users already know from Finder. */
export const QUICK_LOOK: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: "y" },
  Windows: { modifiers: ["ctrl"], key: "y" },
};

/** Cmd+I mirrors the "get info" convention users know from Finder. */
export const TOGGLE_DETAIL: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: "i" },
  Windows: { modifiers: ["ctrl"], key: "i" },
};
