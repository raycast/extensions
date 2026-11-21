import { Keyboard } from "@raycast/api";

const withShift = (key: Keyboard.KeyEquivalent): Keyboard.Shortcut => ({
  macOS: { modifiers: ["cmd", "shift"], key },
  Windows: { modifiers: ["ctrl", "shift"], key },
});

// Raycast's common shortcuts take many ⌘ letter keys, so these add Shift. macOS takes ⌘⇧Q, so quotes use U.
export const SHORTCUTS = {
  thread: withShift("t"),
  quotes: withShift("u"),
  author: withShift("a"),
  mentions: withShift("m"),
  quicklink: withShift("s"),
};
