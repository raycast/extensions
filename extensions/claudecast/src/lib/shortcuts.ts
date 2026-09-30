import { Keyboard } from "@raycast/api";

function platformShortcut(
  key: Keyboard.KeyEquivalent,
  macOS: Keyboard.KeyModifier[],
  Windows: Keyboard.KeyModifier[],
): Keyboard.Shortcut {
  return {
    macOS: { modifiers: macOS, key },
    Windows: { modifiers: Windows, key },
  };
}

export const shortcut = {
  primary: (key: Keyboard.KeyEquivalent) =>
    platformShortcut(key, ["cmd"], ["ctrl"]),
  primaryShift: (key: Keyboard.KeyEquivalent) =>
    platformShortcut(key, ["cmd", "shift"], ["ctrl", "shift"]),
  primaryAlt: (key: Keyboard.KeyEquivalent) =>
    platformShortcut(key, ["cmd", "opt"], ["ctrl", "alt"]),
  copy: Keyboard.Shortcut.Common.Copy,
  copyPath: Keyboard.Shortcut.Common.CopyPath,
  edit: Keyboard.Shortcut.Common.Edit,
  open: Keyboard.Shortcut.Common.Open,
  refresh: Keyboard.Shortcut.Common.Refresh,
  remove: Keyboard.Shortcut.Common.Remove,
};
