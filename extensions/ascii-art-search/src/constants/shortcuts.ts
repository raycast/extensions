/**
 * Keyboard shortcuts configuration
 */
import type { Keyboard } from "@raycast/api";

export const SHORTCUTS: Record<string, Keyboard.Shortcut> = {
  copy: { modifiers: ["cmd"], key: "c" },
  paste: { modifiers: ["cmd"], key: "return" },
  pasteKeepOpen: { modifiers: ["cmd", "shift"], key: "return" },
  copyUnicode: { modifiers: ["cmd", "shift"], key: "u" },
  copyAllFromSection: { modifiers: ["cmd", "shift"], key: "c" },
  togglePin: { modifiers: ["cmd", "shift"], key: "p" },
  switchType: { modifiers: ["cmd"], key: "t" },
  save: { modifiers: ["cmd"], key: "s" },
  edit: { modifiers: ["cmd"], key: "e" },
  delete: { modifiers: ["ctrl"], key: "x" },
};
