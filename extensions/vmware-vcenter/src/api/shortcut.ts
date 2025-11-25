import { Keyboard } from "@raycast/api";

export const Shortcut = {
  Open: Keyboard.Shortcut.Common.Open,
  Refresh: Keyboard.Shortcut.Common.Refresh,
  OpenWith: Keyboard.Shortcut.Common.OpenWith,
  CopyName: Keyboard.Shortcut.Common.CopyName,
  CopyPath: Keyboard.Shortcut.Common.CopyPath,
  ToggleQuickLook: Keyboard.Shortcut.Common.ToggleQuickLook,
  OpenInBrowser: {
    macOS: { modifiers: ["cmd"], key: "b" },
    Windows: { modifiers: ["ctrl"], key: "b" },
  } satisfies Keyboard.Shortcut,
  TogglePower: {
    macOS: { modifiers: ["ctrl", "opt", "shift"], key: "p" },
    Windows: { modifiers: ["ctrl", "alt", "shift"], key: "p" },
  } satisfies Keyboard.Shortcut,
  GuestRestart: {
    macOS: { modifiers: ["ctrl", "shift"], key: "r" },
    Windows: { modifiers: ["ctrl", "shift"], key: "r" },
  } satisfies Keyboard.Shortcut,
  GuestShutdown: {
    macOS: { modifiers: ["ctrl", "shift"], key: "p" },
    Windows: { modifiers: ["ctrl", "shift"], key: "p" },
  } satisfies Keyboard.Shortcut,
  Suspend: {
    macOS: { modifiers: ["ctrl", "shift"], key: "s" },
    Windows: { modifiers: ["ctrl", "shift"], key: "s" },
  } satisfies Keyboard.Shortcut,
  Reset: {
    macOS: { modifiers: ["ctrl", "opt", "shift"], key: "r" },
    Windows: { modifiers: ["ctrl", "alt", "shift"], key: "r" },
  } satisfies Keyboard.Shortcut,
} as const;
