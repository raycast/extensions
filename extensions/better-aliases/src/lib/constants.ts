import type { Keyboard } from "@raycast/api";

const MACOS_MODIFIERS: Keyboard.KeyModifier[] = ["cmd"];
const WINDOWS_MODIFIERS: Keyboard.KeyModifier[] = ["ctrl"];
const COPY_KEY: Keyboard.KeyEquivalent = "c";
const VIEW_KEY: Keyboard.KeyEquivalent = "v";
const GO_BACK_KEY: Keyboard.KeyEquivalent = "[";

export const KEYBOARD_SHORTCUTS = {
  COPY_VALUE: {
    macOS: { modifiers: MACOS_MODIFIERS, key: COPY_KEY },
    Windows: { modifiers: WINDOWS_MODIFIERS, key: COPY_KEY },
  },
  VIEW: {
    macOS: { modifiers: MACOS_MODIFIERS, key: VIEW_KEY },
    Windows: { modifiers: WINDOWS_MODIFIERS, key: VIEW_KEY },
  },
  GO_BACK: {
    macOS: { modifiers: MACOS_MODIFIERS, key: GO_BACK_KEY },
    Windows: { modifiers: WINDOWS_MODIFIERS, key: GO_BACK_KEY },
  },
};
