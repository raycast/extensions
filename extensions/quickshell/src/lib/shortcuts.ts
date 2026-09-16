import type { Keyboard } from "@raycast/api";

type SimpleShortcut = {
  modifiers: Keyboard.KeyModifier[];
  key: Keyboard.KeyEquivalent;
};

/** Map macOS cmd/opt shortcuts to Windows ctrl/alt equivalents for dual-platform manifests. */
export function dualPlatformShortcut(macOS: SimpleShortcut, windows?: SimpleShortcut): Keyboard.Shortcut {
  return {
    macOS,
    Windows:
      windows ??
      ({
        modifiers: macOS.modifiers.map((modifier) => {
          if (modifier === "cmd") {
            return "ctrl";
          }
          if (modifier === "opt") {
            return "alt";
          }
          return modifier;
        }),
        key: macOS.key,
      } satisfies SimpleShortcut),
  };
}
