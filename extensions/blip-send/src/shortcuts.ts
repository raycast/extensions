import { Keyboard } from "@raycast/api";

/** A shortcut on the key Raycast users reach for first: command on the Mac, control on Windows. */
function primary(key: Keyboard.KeyEquivalent, extra: Keyboard.KeyModifier[] = []): Keyboard.Shortcut {
  return {
    macOS: { modifiers: ["cmd", ...extra], key },
    Windows: { modifiers: ["ctrl", ...extra], key },
  };
}

export const Shortcuts = {
  copyEmail: primary("c"),
  openBlip: primary("b"),
  showTransfers: primary("t"),
  toggleDetails: primary("d"),
  showInFileManager: primary("f", ["shift"]),
  // Windows already uses control+c for copy, so cancelling needs the extra modifier there.
  cancelTransfer: {
    macOS: { modifiers: ["ctrl"], key: "c" },
    Windows: { modifiers: ["ctrl", "shift"], key: "c" },
  } satisfies Keyboard.Shortcut,
};
