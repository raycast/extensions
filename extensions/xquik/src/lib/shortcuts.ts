import { Keyboard } from "@raycast/api";

const withShift = (key: Keyboard.KeyEquivalent): Keyboard.Shortcut => ({
  macOS: { modifiers: ["cmd", "shift"], key },
  Windows: { modifiers: ["ctrl", "shift"], key },
});

// Raycast reserves ⌘P for the search bar dropdown and macOS takes ⌘⇧Q, so these shortcuts add Shift.
export const SHORTCUTS = {
  replies: withShift("r"),
  thread: withShift("t"),
  quotes: withShift("u"),
  author: withShift("a"),
  posts: withShift("p"),
  mentions: withShift("m"),
  quicklink: withShift("s"),
};
