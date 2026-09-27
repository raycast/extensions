// The shortcuts Keyboard.Shortcut.Common has no name for.
//
// Spelled out per platform because the extension ships for both, and a bare
// "cmd" binds nothing on Windows. Anything Common does cover is taken from there
// instead, so this list stays short.

import { Keyboard } from "@raycast/api";

function both(key: Keyboard.KeyEquivalent, shift = false): Keyboard.Shortcut {
  return {
    macOS: { modifiers: shift ? ["cmd", "shift"] : ["cmd"], key },
    Windows: { modifiers: shift ? ["ctrl", "shift"] : ["ctrl"], key },
  };
}

export const TOGGLE_VIEW = both("t");
export const COPY_MARKDOWN = both("m", true);
export const COPY_PROSE = both("e", true);
export const COPY_LINK = both("l", true);
