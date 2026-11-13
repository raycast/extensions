import { Keyboard } from "@raycast/api";

const WINDOWS_MODIFIER: Partial<Record<Keyboard.KeyModifier, Keyboard.KeyModifier>> = { cmd: "ctrl", opt: "alt" };

/** A shortcut given with macOS modifiers; Windows gets ⌘ → Ctrl and ⌥ → Alt. */
function shortcut(modifiers: Keyboard.KeyModifier[], key: Keyboard.KeyEquivalent): Keyboard.Shortcut {
  return {
    macOS: { modifiers, key },
    Windows: { modifiers: modifiers.map((modifier) => WINDOWS_MODIFIER[modifier] ?? modifier), key },
  };
}

export const Shortcuts = {
  RunCommand: shortcut(["cmd"], "e"),
  OpenDesktop: shortcut(["cmd"], "d"),
  Screenshot: shortcut(["cmd", "shift"], "s"),
  CopySsh: shortcut(["cmd", "shift"], "c"),
  CopyId: shortcut(["cmd"], "."),
  // ⌘P is reserved by Raycast.
  PauseResume: shortcut(["cmd", "opt"], "p"),
  StartStop: shortcut(["cmd", "shift"], "p"),
  IdlePause: shortcut(["cmd"], "t"),
  Ports: shortcut(["cmd", "shift"], "o"),
  Snapshot: shortcut(["cmd", "shift"], "n"),
  Usage: shortcut(["cmd"], "u"),
};
