import { Keyboard } from "@raycast/api";

export interface ShortcutDefinition {
  modifiers: Keyboard.KeyModifier[];
  key: Keyboard.KeyEquivalent;
  description: string;
}

export interface ContextualShortcuts {
  [context: string]: {
    [action: string]: ShortcutDefinition;
  };
}

export const RESERVED_SHORTCUTS: ShortcutDefinition[] = [
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

  { modifiers: ["cmd"], key: "a", description: "Select all" },
  { modifiers: ["cmd"], key: "c", description: "Copy" },
  { modifiers: ["cmd"], key: "v", description: "Paste" },
  { modifiers: ["cmd"], key: "x", description: "Cut" },
  { modifiers: ["cmd"], key: "z", description: "Undo" },
  { modifiers: ["cmd", "shift"], key: "z", description: "Redo" },

  { modifiers: ["cmd"], key: "+", description: "Zoom in" },
  { modifiers: ["cmd"], key: "-", description: "Zoom out" },
  { modifiers: ["cmd"], key: "0", description: "Reset zoom" },

  { modifiers: ["cmd"], key: "p", description: "Open command palette" },
  { modifiers: ["cmd"], key: "k", description: "Search" },
  { modifiers: ["cmd"], key: "j", description: "Toggle between views" },
  { modifiers: ["cmd"], key: "l", description: "Clear search" },
  { modifiers: ["cmd"], key: "i", description: "Toggle information" },
  { modifiers: ["cmd"], key: "d", description: "Toggle debug" },
  { modifiers: ["cmd"], key: "r", description: "Refresh" },
  { modifiers: ["cmd"], key: "e", description: "Edit" },
  { modifiers: ["cmd"], key: "s", description: "Save" },

  { modifiers: ["cmd"], key: "arrowUp", description: "Move to top" },
  { modifiers: ["cmd"], key: "arrowDown", description: "Move to bottom" },
  { modifiers: ["opt"], key: "arrowUp", description: "Move up 5 items" },
  { modifiers: ["opt"], key: "arrowDown", description: "Move down 5 items" },

  { modifiers: ["cmd"], key: "return", description: "Submit form" },
  { modifiers: ["cmd"], key: "escape", description: "Cancel" },
];

export function isReservedShortcut(modifiers: Keyboard.KeyModifier[], key: Keyboard.KeyEquivalent): boolean {
  return RESERVED_SHORTCUTS.some(
    (shortcut) =>
      shortcut.key === key &&
      shortcut.modifiers.length === modifiers.length &&
      shortcut.modifiers.every((mod) => modifiers.includes(mod)),
  );
}

export const COMMON_SHORTCUTS = {
  REFRESH: { modifiers: ["cmd", "shift"], key: "r", description: "Refresh" },
  CANCEL: { modifiers: ["cmd", "shift"], key: "c", description: "Cancel" },
  DELETE: { modifiers: ["cmd", "shift"], key: "backspace", description: "Delete item" },
};

export const CONTEXTUAL_SHORTCUTS: ContextualShortcuts = {
  PROJECT: {
    CREATE: { modifiers: ["cmd", "shift"], key: "n", description: "Create new project" },
    VIEW_DETAILS: { modifiers: ["cmd", "shift"], key: "i", description: "View project details" },
    SWITCH: { modifiers: ["cmd", "shift"], key: "s", description: "Switch project" },
  },

  BUCKET: {
    CREATE: { modifiers: ["cmd", "shift"], key: "n", description: "Create new bucket" },
    VIEW_OBJECTS: { modifiers: ["cmd", "shift"], key: "o", description: "View objects" },
    VIEW_IAM: { modifiers: ["cmd", "shift"], key: "i", description: "View IAM permissions" },
    VIEW_LIFECYCLE: { modifiers: ["cmd", "shift"], key: "l", description: "View lifecycle rules" },
  },

  OBJECT: {
    CREATE: { modifiers: ["cmd", "shift"], key: "n", description: "Create/upload new object" },
    DOWNLOAD: { modifiers: ["cmd", "shift"], key: "d", description: "Download object" },
    VIEW_DETAILS: { modifiers: ["cmd", "shift"], key: "i", description: "View object details" },
    COPY_URL: { modifiers: ["cmd"], key: "u", description: "Copy object URL" },
  },

  IAM: {
    ADD_MEMBER: { modifiers: ["cmd", "shift"], key: "n", description: "Add new IAM member" },
    SWITCH_VIEW: { modifiers: ["cmd"], key: "v", description: "Switch IAM view" },
    FILTER: { modifiers: ["cmd", "shift"], key: "f", description: "Filter IAM members" },
  },

  COMPUTE: {
    CREATE: { modifiers: ["cmd", "shift"], key: "n", description: "Create new instance" },
    START: { modifiers: ["cmd", "shift"], key: "s", description: "Start instance" },
    STOP: { modifiers: ["cmd", "shift"], key: "p", description: "Stop instance" },
    CONNECT: { modifiers: ["cmd", "shift"], key: "t", description: "Connect to instance" },
  },
};

export function getContextualShortcut(context: string, action: string): ShortcutDefinition | undefined {
  if (CONTEXTUAL_SHORTCUTS[context] && CONTEXTUAL_SHORTCUTS[context][action]) {
    return CONTEXTUAL_SHORTCUTS[context][action];
  }
  return undefined;
}

export function getActionShortcut(shortcut: ShortcutDefinition): {
  modifiers: Keyboard.KeyModifier[];
  key: Keyboard.KeyEquivalent;
} {
  const { modifiers, key } = shortcut;
  return { modifiers, key };
}
