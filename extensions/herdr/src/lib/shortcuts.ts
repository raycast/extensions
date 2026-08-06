import type { Keyboard } from "@raycast/api";

/**
 * Shared action shortcuts. Keep these clear of Raycast's reserved shortcuts;
 * Raycast silently removes a reserved shortcut at runtime.
 */
export const shortcuts = {
  refresh: { modifiers: ["cmd", "shift"], key: "r" },
  attach: { modifiers: ["cmd", "shift"], key: "t" },
  prompt: { modifiers: ["cmd", "shift"], key: "p" },
  output: { modifiers: ["cmd"], key: "o" },
  rename: { modifiers: ["cmd"], key: "r" },
  create: { modifiers: ["cmd"], key: "n" },
  createWorkspace: { modifiers: ["cmd", "shift"], key: "n" },
  startAgent: { modifiers: ["cmd", "shift"], key: "a" },
  copyId: { modifiers: ["cmd"], key: "c" },
  copyPath: { modifiers: ["cmd", "shift"], key: "c" },
  delete: { modifiers: ["ctrl"], key: "x" },
} satisfies Record<string, Keyboard.Shortcut>;
