import { Keyboard } from "@raycast/api";

/**
 * Raycast calls `cmd`, `ctrl` and `windows` "ambiguous" modifiers: a shortcut
 * built from them has to name both platforms explicitly, or it won't bind on
 * the other one. The `Common.*` shortcuts are already cross-platform.
 * See https://developers.raycast.com/api-reference/keyboard
 */
export const REFRESH = Keyboard.Shortcut.Common.Refresh;
export const COPY_LINK = Keyboard.Shortcut.Common.Copy;

export const TOGGLE_PREVIEW: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "d" },
  Windows: { modifiers: ["ctrl", "shift"], key: "d" },
};

export const FETCH_DETAILS: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: "f" },
  Windows: { modifiers: ["ctrl"], key: "f" },
};

export const SUBMIT_FORM: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "return" },
  Windows: { modifiers: ["ctrl", "shift"], key: "return" },
};

export const PREVIEW_IMAGE: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "p" },
  Windows: { modifiers: ["ctrl", "shift"], key: "p" },
};

// Form `info` hints are plain strings, so they spell the keys out themselves.
// macOS glyphs mean nothing on a Windows keyboard.
const isWindows = process.platform === "win32";
export const SUBMIT_HINT = isWindows ? "Ctrl+Enter" : "⌘↵";
export const PREVIEW_IMAGE_HINT = isWindows ? "Ctrl+Shift+P" : "⌘⇧P";
