import { Keyboard } from "@raycast/api";

export const changeApiToken = {
  macOS: { modifiers: ["cmd"], key: "t" },
  Windows: { modifiers: ["ctrl"], key: "t" },
} satisfies Keyboard.Shortcut;

export const manageSubscription = {
  macOS: { modifiers: ["cmd"], key: "b" },
  Windows: { modifiers: ["ctrl"], key: "b" },
} satisfies Keyboard.Shortcut;

export const generateToken = {
  macOS: { modifiers: ["cmd", "shift"], key: "g" },
  Windows: { modifiers: ["ctrl", "shift"], key: "g" },
} satisfies Keyboard.Shortcut;

export const copyUrl = {
  macOS: { modifiers: ["cmd"], key: "." },
  Windows: { modifiers: ["ctrl"], key: "." },
} satisfies Keyboard.Shortcut;

export const refresh = Keyboard.Shortcut.Common.Refresh;
export const remove = Keyboard.Shortcut.Common.Remove;
