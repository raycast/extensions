import type { Keyboard } from "@raycast/api";

/**
 * Shortcuts Raycast has no `Keyboard.Shortcut.Common` binding for.
 *
 * Each one is the binding other extensions in the store reach for first, so a
 * key that works elsewhere works here: nothing below is a house convention.
 */
export const SHORTCUTS = {
  /** The settings binding, and managing sites is this extension's settings. */
  manage: {
    macOS: { modifiers: ["cmd"], key: "m" },
    Windows: { modifiers: ["ctrl"], key: "m" },
  } as Keyboard.Shortcut,
  /** A harder refresh than `Common.Refresh`, and a shift away from it. */
  clearCache: {
    macOS: { modifiers: ["cmd", "shift"], key: "r" },
    Windows: { modifiers: ["ctrl", "shift"], key: "r" },
  } as Keyboard.Shortcut,
  /** P for presenter; the deck itself already opens on Enter. */
  presenter: {
    macOS: { modifiers: ["cmd", "shift"], key: "p" },
    Windows: { modifiers: ["ctrl", "shift"], key: "p" },
  } as Keyboard.Shortcut,
  sort: {
    macOS: { modifiers: ["cmd", "shift"], key: "s" },
    Windows: { modifiers: ["ctrl", "shift"], key: "s" },
  } as Keyboard.Shortcut,
  /** What "Toggle Details" is bound to across the store, by a wide margin. */
  toggleDetail: {
    macOS: { modifiers: ["cmd", "shift"], key: "d" },
    Windows: { modifiers: ["ctrl", "shift"], key: "d" },
  } as Keyboard.Shortcut,
};
