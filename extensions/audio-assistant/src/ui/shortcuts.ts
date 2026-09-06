import type { Keyboard } from "@raycast/api";
// Physical Ctrl on both platforms for the requested volume controls.
// Use Cmd on macOS / Ctrl on Windows for the remaining application actions.
const primary: Keyboard.KeyModifier = process.platform === "darwin" ? "cmd" : "ctrl";
const app = (key: Keyboard.KeyEquivalent, shift = false): Keyboard.Shortcut => ({
  modifiers: shift ? [primary, "shift"] : [primary],
  key,
});
export const shortcuts = {
  volumeUp: { modifiers: ["ctrl"], key: "=" } as Keyboard.Shortcut,
  volumeDown: { modifiers: ["ctrl"], key: "-" } as Keyboard.Shortcut,
  playPause: app("p"),
  next: app("arrowRight", true),
  previous: app("arrowLeft", true),
  playNext: app("n", true),
  addToQueue: app("a", true),
  queue: app("q", true),
  repeat: app("r", true),
  shuffle: app("s", true),
  mute: app("m", true),
  refresh: app("r"),
};
