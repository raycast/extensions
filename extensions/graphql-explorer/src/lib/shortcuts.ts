import { Keyboard } from "@raycast/api";

type Key = Keyboard.KeyEquivalent;

/** Cross-platform shortcut: ⌘ on macOS, Ctrl on Windows. */
function primary(key: Key, extra: Keyboard.KeyModifier[] = []): Keyboard.Shortcut {
  return {
    macOS: { modifiers: ["cmd", ...extra], key },
    Windows: { modifiers: ["ctrl", ...extra.map((modifier) => (modifier === "opt" ? "alt" : modifier))], key },
  };
}

export const Shortcuts = {
  ...Keyboard.Shortcut.Common,
  RunIn: primary("r", ["shift"]),
  Rerun: primary("r"),
  ToggleDetail: primary("d", ["shift"]),
  Environments: primary("e", ["shift"]),
  Format: primary("f", ["shift"]),
  Preview: primary("p", ["shift"]),
  CopySecondary: primary("c", ["opt"]),
  CopyCurl: primary("u", ["shift"]),
  TestConnection: primary("t", ["shift"]),
  ReloadSchema: primary("l", ["shift"]),
  Reset: primary("backspace", ["shift"]),
  OpenInEditor: primary("o"),
  AddRow: primary("n"),
  // ⌃X like Raycast's own "remove" shortcut; Ctrl+X on Windows is Cut, so add Shift there.
  RemoveRow: {
    macOS: { modifiers: ["ctrl"], key: "x" },
    Windows: { modifiers: ["ctrl", "shift"], key: "x" },
  },
} satisfies Record<string, Keyboard.Shortcut>;
