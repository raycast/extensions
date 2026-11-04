// Platform-dependent copy. Shortcuts themselves are declared per platform on
// each Action; this covers the places where a shortcut is *written out* for
// the user (error hints, README-style labels), which Raycast can't translate.

export const isWindows = process.platform === "win32";

/** Pick the human-readable form of a shortcut for the current platform, e.g. keys("⌘R", "Ctrl+R"). */
export function keys(macOS: string, windows: string): string {
  return isWindows ? windows : macOS;
}

/** Suffix for error states whose action panel has Keyboard.Shortcut.Common.Refresh bound. */
export const RETRY_HINT = `Press ${keys("⌘R", "Ctrl+R")} to retry.`;
