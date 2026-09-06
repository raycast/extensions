import type { Keyboard } from "@raycast/api";

// Physical Ctrl on both platforms for the requested volume controls.
// Use Cmd on macOS / Ctrl on Windows for application actions.
const app = (key: Keyboard.KeyEquivalent, shift = false): Keyboard.Shortcut => ({
  macOS: {
    modifiers: shift ? ["cmd", "shift"] : ["cmd"],
    key,
  },
  Windows: {
    modifiers: shift ? ["ctrl", "shift"] : ["ctrl"],
    key,
  },
});

export const shortcuts = {
  volumeUp: {
    macOS: { modifiers: ["ctrl"], key: "=" },
    Windows: { modifiers: ["ctrl"], key: "=" },
  } as Keyboard.Shortcut,
  volumeDown: {
    macOS: { modifiers: ["ctrl"], key: "-" },
    Windows: { modifiers: ["ctrl"], key: "-" },
  } as Keyboard.Shortcut,
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
