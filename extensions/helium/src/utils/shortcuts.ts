import { Keyboard } from "@raycast/api";

/**
 * Keyboard shortcuts declared per platform.
 *
 * Raycast ignores a shortcut entirely on the platform its modifiers don't apply
 * to, so a bare `{ modifiers: ["cmd"], … }` silently does nothing on Windows.
 * Declaring both halves keeps every action reachable on both platforms with the
 * modifier its users expect (`cmd` → `ctrl`, `opt` → `alt`).
 *
 * `Keyboard.Shortcut.Common.*` is already cross-platform; prefer it when an
 * action matches one of the standard intents.
 */
function crossPlatform(
  macModifiers: Keyboard.KeyModifier[],
  windowsModifiers: Keyboard.KeyModifier[],
  key: Keyboard.KeyEquivalent,
): Keyboard.Shortcut {
  return {
    macOS: { modifiers: macModifiers, key },
    Windows: { modifiers: windowsModifiers, key },
  };
}

export const SHORTCUTS = {
  /** New tab. */
  newTab: crossPlatform(["cmd"], ["ctrl"], "n"),
  /** Close the selected tab. */
  closeTab: crossPlatform(["cmd", "shift"], ["ctrl", "shift"], "w"),
  /** Close every duplicate tab. */
  deduplicateTabs: crossPlatform(["cmd", "shift", "ctrl"], ["ctrl", "shift", "alt"], "w"),
  /** Open the selected item in a new tab. */
  openInNewTab: crossPlatform(["cmd", "shift"], ["ctrl", "shift"], "o"),
  /** Open the selected item in the system default browser. */
  openInDefaultBrowser: crossPlatform(["cmd", "opt"], ["ctrl", "alt"], "o"),
  copyUrl: crossPlatform(["cmd"], ["ctrl"], "c"),
  copyTitle: crossPlatform(["cmd", "shift"], ["ctrl", "shift"], "c"),
  /** Same slot as {@link SHORTCUTS.copyTitle}, in lists that have no title to copy. */
  copyQuery: crossPlatform(["cmd", "shift"], ["ctrl", "shift"], "c"),
  copyAsMarkdown: crossPlatform(["cmd", "opt"], ["ctrl", "alt"], "c"),
  createQuicklink: crossPlatform(["cmd", "shift"], ["ctrl", "shift"], "q"),
} satisfies Record<string, Keyboard.Shortcut>;
