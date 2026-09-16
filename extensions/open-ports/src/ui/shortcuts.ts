import { Keyboard } from "@raycast/api";

/**
 * Every shortcut in one place, so a new action cannot silently collide with an existing
 * one. Destructive actions are deliberately kept on Control rather than Command.
 */
export const SHORTCUTS = {
  toggleDetail: { modifiers: ["cmd"], key: "d" },
  openInBrowser: { modifiers: ["cmd"], key: "o" },
  copyPid: { modifiers: ["cmd", "shift"], key: "p" },
  copyProcessName: { modifiers: ["cmd", "shift"], key: "n" },
  copyAddress: { modifiers: ["cmd", "shift"], key: "a" },
  copyKillCommand: { modifiers: ["cmd", "shift"], key: "k" },
  copyLsofRow: { modifiers: ["cmd", "shift"], key: "l" },
  showInFinder: { modifiers: ["cmd", "shift"], key: "f" },
  kill: { modifiers: ["ctrl"], key: "x" },
  forceKill: { modifiers: ["ctrl", "shift"], key: "x" },
  killAsAdmin: { modifiers: ["ctrl", "opt"], key: "x" },
  reload: { modifiers: ["cmd"], key: "r" },
  reloadAsAdmin: { modifiers: ["cmd", "shift"], key: "r" },
} as const satisfies Record<string, Keyboard.Shortcut>;
