import { Keyboard } from "@raycast/api";

export const cmdOrCtrl = (key: Keyboard.KeyEquivalent, ...extra: Keyboard.KeyModifier[]): Keyboard.Shortcut => ({
  macOS: { modifiers: ["cmd", ...extra], key },
  Windows: { modifiers: ["ctrl", ...extra], key },
});
