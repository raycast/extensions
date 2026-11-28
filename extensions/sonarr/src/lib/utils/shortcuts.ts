import type { Keyboard } from "@raycast/api";

/**
 * Keyboard shortcuts declared per platform.
 *
 * A shortcut that only names `cmd` is ignored on Windows, so every binding is
 * declared for both platforms. The macOS bindings are unchanged from the
 * macOS-only releases; Windows mirrors them with `ctrl`.
 *
 * Actions whose shortcut already matches a Raycast-wide convention use
 * `Keyboard.Shortcut.Common` directly instead of an entry here.
 */
export const Shortcuts = {
  searchEpisode: {
    macOS: { modifiers: ["cmd"], key: "s" },
    Windows: { modifiers: ["ctrl"], key: "s" },
  },
  searchSeason: {
    macOS: { modifiers: ["cmd", "shift"], key: "s" },
    Windows: { modifiers: ["ctrl", "shift"], key: "s" },
  },
  toggleMonitoring: {
    macOS: { modifiers: ["cmd"], key: "m" },
    Windows: { modifiers: ["ctrl"], key: "m" },
  },
  viewDetails: {
    macOS: { modifiers: ["cmd"], key: "d" },
    Windows: { modifiers: ["ctrl"], key: "d" },
  },
  copyPath: {
    macOS: { modifiers: ["cmd"], key: "c" },
    Windows: { modifiers: ["ctrl"], key: "c" },
  },
  // Windows uses `d` rather than a literal `backspace` translation, matching the
  // Remove/RemoveAll bindings Raycast itself ships on that platform. On Windows,
  // ctrl+backspace deletes the previous word in the always-focused search bar.
  removeFromQueue: {
    macOS: { modifiers: ["cmd"], key: "backspace" },
    Windows: { modifiers: ["ctrl"], key: "d" },
  },
  removeAndBlocklist: {
    macOS: { modifiers: ["cmd", "shift"], key: "backspace" },
    Windows: { modifiers: ["ctrl", "shift"], key: "d" },
  },
  switchInstance: {
    macOS: { modifiers: ["cmd", "shift"], key: "i" },
    Windows: { modifiers: ["ctrl", "shift"], key: "i" },
  },
  configureAndAdd: {
    macOS: { modifiers: ["cmd", "shift"], key: "a" },
    Windows: { modifiers: ["ctrl", "shift"], key: "a" },
  },
} satisfies Record<string, Keyboard.Shortcut>;
