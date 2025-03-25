/**
 * Raycast Reserved Shortcuts
 *
 * This file tracks shortcuts that are reserved by Raycast and should not be used in custom actions.
 * Reference: https://developers.raycast.com/api-reference/keyboard
 */

import { Keyboard } from "@raycast/api";

/**
 * Interface for shortcut definition that extends Raycast's Keyboard.Shortcut
 */
export interface ShortcutDefinition {
  modifiers: Keyboard.KeyModifier[];
  key: Keyboard.KeyEquivalent;
  description: string;
}

/**
 * Interface for context-specific shortcuts
 */
export interface ContextualShortcuts {
  [context: string]: {
    [action: string]: ShortcutDefinition;
  };
}

/**
 * List of shortcuts reserved by Raycast that should not be used in custom actions
 */
export const RESERVED_SHORTCUTS: ShortcutDefinition[] = [
  // Navigation
  { modifiers: ["cmd"], key: ".", description: "Toggle command palette" },
  { modifiers: ["cmd"], key: ",", description: "Open preferences" },
  { modifiers: ["cmd"], key: "o", description: "Open file" },
  { modifiers: ["cmd"], key: "n", description: "New window" },
  { modifiers: ["cmd"], key: "w", description: "Close window" },
  { modifiers: ["cmd"], key: "q", description: "Quit Raycast" },
  { modifiers: ["cmd"], key: "h", description: "Hide Raycast" },
  { modifiers: ["cmd"], key: "m", description: "Minimize window" },
  { modifiers: ["cmd"], key: "f", description: "Find" },
  { modifiers: ["cmd"], key: "g", description: "Find next" },
  { modifiers: ["cmd", "shift"], key: "g", description: "Find previous" },

  // Editing
  { modifiers: ["cmd"], key: "a", description: "Select all" },
  { modifiers: ["cmd"], key: "c", description: "Copy" },
  { modifiers: ["cmd"], key: "v", description: "Paste" },
  { modifiers: ["cmd"], key: "x", description: "Cut" },
  { modifiers: ["cmd"], key: "z", description: "Undo" },
  { modifiers: ["cmd", "shift"], key: "z", description: "Redo" },

  // View
  { modifiers: ["cmd"], key: "+", description: "Zoom in" },
  { modifiers: ["cmd"], key: "-", description: "Zoom out" },
  { modifiers: ["cmd"], key: "0", description: "Reset zoom" },

  // Extensions
  { modifiers: ["cmd"], key: "p", description: "Open command palette" },
  { modifiers: ["cmd"], key: "k", description: "Search" },
  { modifiers: ["cmd"], key: "j", description: "Toggle between views" },
  { modifiers: ["cmd"], key: "l", description: "Clear search" },
  { modifiers: ["cmd"], key: "i", description: "Toggle information" },
  { modifiers: ["cmd"], key: "d", description: "Toggle debug" },
  { modifiers: ["cmd"], key: "r", description: "Refresh" },
  { modifiers: ["cmd"], key: "e", description: "Edit" },
  { modifiers: ["cmd"], key: "s", description: "Save" },

  // List Navigation
  { modifiers: ["cmd"], key: "arrowUp", description: "Move to top" },
  { modifiers: ["cmd"], key: "arrowDown", description: "Move to bottom" },
  { modifiers: ["opt"], key: "arrowUp", description: "Move up 5 items" },
  { modifiers: ["opt"], key: "arrowDown", description: "Move down 5 items" },

  // Form Navigation
  { modifiers: ["cmd"], key: "return", description: "Submit form" },
  { modifiers: ["cmd"], key: "escape", description: "Cancel" },
];

/**
 * Check if a shortcut is reserved by Raycast
 * @param modifiers Array of modifier keys (e.g., ["cmd", "shift"])
 * @param key The key (e.g., "a", "return")
 * @returns True if the shortcut is reserved, false otherwise
 */
export function isReservedShortcut(modifiers: Keyboard.KeyModifier[], key: Keyboard.KeyEquivalent): boolean {
  return RESERVED_SHORTCUTS.some(
    (shortcut) =>
      shortcut.key === key &&
      shortcut.modifiers.length === modifiers.length &&
      shortcut.modifiers.every((mod) => modifiers.includes(mod)),
  );
}

/**
 * Common safe shortcuts that can be used across different contexts
 */
export const COMMON_SHORTCUTS = {
  REFRESH: { modifiers: ["cmd", "shift"], key: "r", description: "Refresh" },
  CANCEL: { modifiers: ["cmd", "shift"], key: "c", description: "Cancel" },
  DELETE: { modifiers: ["cmd", "shift"], key: "backspace", description: "Delete item" },
};

/**
 * Context-specific shortcuts for different views in the Google Cloud extension
 */
export const CONTEXTUAL_SHORTCUTS: ContextualShortcuts = {
  // Project view shortcuts
  PROJECT: {
    CREATE: { modifiers: ["cmd", "shift"], key: "n", description: "Create new project" },
    VIEW_DETAILS: { modifiers: ["cmd", "shift"], key: "i", description: "View project details" },
    SWITCH: { modifiers: ["cmd", "shift"], key: "s", description: "Switch project" },
  },

  // Bucket view shortcuts
  BUCKET: {
    CREATE: { modifiers: ["cmd", "shift"], key: "n", description: "Create new bucket" },
    VIEW_OBJECTS: { modifiers: ["cmd", "shift"], key: "o", description: "View objects" },
    VIEW_IAM: { modifiers: ["cmd", "shift"], key: "i", description: "View IAM permissions" },
    VIEW_LIFECYCLE: { modifiers: ["cmd", "shift"], key: "l", description: "View lifecycle rules" },
  },

  // Object view shortcuts
  OBJECT: {
    CREATE: { modifiers: ["cmd", "shift"], key: "n", description: "Create/upload new object" },
    DOWNLOAD: { modifiers: ["cmd", "shift"], key: "d", description: "Download object" },
    VIEW_DETAILS: { modifiers: ["cmd", "shift"], key: "i", description: "View object details" },
    COPY_URL: { modifiers: ["cmd"], key: "u", description: "Copy object URL" },
  },

  // IAM view shortcuts
  IAM: {
    ADD_MEMBER: { modifiers: ["cmd", "shift"], key: "n", description: "Add new IAM member" },
    SWITCH_VIEW: { modifiers: ["cmd"], key: "v", description: "Switch IAM view" },
    FILTER: { modifiers: ["cmd", "shift"], key: "f", description: "Filter IAM members" },
  },

  // Compute view shortcuts
  COMPUTE: {
    CREATE: { modifiers: ["cmd", "shift"], key: "n", description: "Create new instance" },
    START: { modifiers: ["cmd", "shift"], key: "s", description: "Start instance" },
    STOP: { modifiers: ["cmd", "shift"], key: "p", description: "Stop instance" },
    CONNECT: { modifiers: ["cmd", "shift"], key: "t", description: "Connect to instance" },
  },
};

/**
 * Get a shortcut for a specific context and action
 * @param context The current view context (e.g., "BUCKET", "OBJECT")
 * @param action The action to perform (e.g., "CREATE", "DELETE")
 * @returns The shortcut definition or undefined if not found
 */
export function getContextualShortcut(context: string, action: string): ShortcutDefinition | undefined {
  if (CONTEXTUAL_SHORTCUTS[context] && CONTEXTUAL_SHORTCUTS[context][action]) {
    return CONTEXTUAL_SHORTCUTS[context][action];
  }
  return undefined;
}

/**
 * Get a valid shortcut object for the Action component
 * This removes the description property which is not accepted by the Action component
 * @param shortcut The full shortcut definition
 * @returns A valid shortcut object for the Action component
 */
export function getActionShortcut(shortcut: ShortcutDefinition): {
  modifiers: Keyboard.KeyModifier[];
  key: Keyboard.KeyEquivalent;
} {
  const { modifiers, key } = shortcut;
  return { modifiers, key };
}
