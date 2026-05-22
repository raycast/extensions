import { Keyboard } from "@raycast/api";

const windowsModifierMap: Partial<Record<Keyboard.KeyModifier, Keyboard.KeyModifier>> = {
  cmd: "ctrl",
  opt: "alt",
};

const platformShortcut = (key: Keyboard.KeyEquivalent, modifiers: Keyboard.KeyModifier[]): Keyboard.Shortcut => ({
  macOS: { key, modifiers },
  Windows: {
    key,
    modifiers: modifiers.map((modifier) => windowsModifierMap[modifier] ?? modifier),
  },
});

const sharedShortcut = (key: Keyboard.KeyEquivalent, modifiers: Keyboard.KeyModifier[]): Keyboard.Shortcut => ({
  macOS: { key, modifiers },
  Windows: { key, modifiers },
});

/**
 * Shared action shortcuts for this extension.
 *
 * Raycast recommends `Keyboard.Shortcut.Common` whenever an action matches a
 * standard command. For ambiguous shortcuts such as `cmd`-based custom bindings,
 * we provide explicit platform mappings to keep Windows behavior consistent.
 */
export const Shortcut = {
  Open: Keyboard.Shortcut.Common.Open,
  OpenWith: Keyboard.Shortcut.Common.OpenWith,
  Copy: Keyboard.Shortcut.Common.Copy,
  Refresh: Keyboard.Shortcut.Common.Refresh,
  Remove: Keyboard.Shortcut.Common.Remove,
  RemoveAll: Keyboard.Shortcut.Common.RemoveAll,
  AlternateOpen: platformShortcut("enter", ["cmd", "shift"]),
  CopySecondary: platformShortcut(".", ["cmd", "shift"]),
  CopyTertiary: platformShortcut(",", ["cmd", "shift"]),
  CreateQuickLink: platformShortcut("l", ["cmd"]),
  OpenInBrowser: platformShortcut("b", ["cmd"]),
  OpenInTerminal: platformShortcut("o", ["cmd", "shift"]),
  RevealInFileManager: platformShortcut("f", ["cmd", "shift"]),
  Pin: platformShortcut("p", ["cmd", "shift"]),
  UnpinAll: sharedShortcut("x", ["ctrl", "shift"]),
  MoveLeft: platformShortcut("arrowLeft", ["cmd", "opt"]),
  MoveUp: platformShortcut("arrowUp", ["cmd", "opt"]),
  MoveRight: platformShortcut("arrowRight", ["cmd", "opt"]),
  MoveDown: platformShortcut("arrowDown", ["cmd", "opt"]),
} satisfies Record<string, Keyboard.Shortcut>;
