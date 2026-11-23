import { Keyboard } from "@raycast/api";

// Shortcuts are collected here so they can be reviewed together.
// Bare arrow keys and the 1 / 2 format keys are defined where they are used.

/**
 * Builds a shortcut that uses ⌘ on macOS and Ctrl on Windows. Raycast asks for
 * both platforms whenever a shortcut uses an ambiguous modifier such as cmd.
 */
function commandShortcut(key: Keyboard.KeyEquivalent, withShift = false): Keyboard.Shortcut {
  const extra: Keyboard.KeyModifier[] = withShift ? ["shift"] : [];
  return {
    macOS: { modifiers: ["cmd", ...extra], key },
    Windows: { modifiers: ["ctrl", ...extra], key },
  };
}

export const COPY_DATE = commandShortcut("c");

export const PREVIOUS_MONTH = commandShortcut("[");
export const NEXT_MONTH = commandShortcut("]");
export const PREVIOUS_YEAR = commandShortcut("[", true);
export const NEXT_YEAR = commandShortcut("]", true);

export const GO_TO_TODAY = commandShortcut("t");
export const GO_TO_MONTH = commandShortcut("m");
export const GO_TO_YEAR = commandShortcut("y");
