import { Keyboard } from "@raycast/api";

/** ⌘⇧U everywhere for "update this item": Input Score, Complete To-Do, Solve Issue, Set Status, Mark as Done. */
export const UPDATE_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "u" },
  Windows: { modifiers: ["ctrl", "shift"], key: "u" },
};
