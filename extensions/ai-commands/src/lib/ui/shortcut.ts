import { Keyboard } from "@raycast/api";

export const Shortcut = {
  New: Keyboard.Shortcut.Common.New,
  Edit: Keyboard.Shortcut.Common.Edit,
  Copy: Keyboard.Shortcut.Common.Copy,
  Remove: Keyboard.Shortcut.Common.Remove,
  CopyName: Keyboard.Shortcut.Common.CopyName,
  ToggleQuickLook: Keyboard.Shortcut.Common.ToggleQuickLook,
  AttachText: {
    macOS: { modifiers: ["cmd"], key: "t" },
    Windows: { modifiers: ["ctrl"], key: "t" },
  } satisfies Keyboard.Shortcut,
  AttachBrowserTab: {
    macOS: { modifiers: ["cmd"], key: "b" },
    Windows: { modifiers: ["ctrl"], key: "b" },
  } satisfies Keyboard.Shortcut,
  AttachImage: {
    macOS: { modifiers: ["cmd"], key: "i" },
    Windows: { modifiers: ["ctrl"], key: "i" },
  } satisfies Keyboard.Shortcut,
  ChangeModel: {
    macOS: { modifiers: ["cmd"], key: "m" },
    Windows: { modifiers: ["ctrl"], key: "m" },
  } satisfies Keyboard.Shortcut,
  UpdateModel: {
    macOS: { modifiers: ["cmd"], key: "u" },
    Windows: { modifiers: ["ctrl"], key: "u" },
  } satisfies Keyboard.Shortcut,
  LoadUnloadModel: {
    macOS: { modifiers: ["cmd"], key: "l" },
    Windows: { modifiers: ["ctrl"], key: "l" },
  } satisfies Keyboard.Shortcut,
  OpenLibrary: {
    macOS: { modifiers: ["cmd"], key: "l" },
    Windows: { modifiers: ["ctrl"], key: "l" },
  } satisfies Keyboard.Shortcut,
  Regenerate: {
    macOS: { modifiers: ["cmd"], key: "r" },
    Windows: { modifiers: ["ctrl"], key: "r" },
  } satisfies Keyboard.Shortcut,
  NewProvider: {
    macOS: { modifiers: ["cmd", "shift"], key: "n" },
    Windows: { modifiers: ["ctrl", "shift"], key: "n" },
  } satisfies Keyboard.Shortcut,
  EditProvider: {
    macOS: { modifiers: ["cmd", "shift"], key: "e" },
    Windows: { modifiers: ["ctrl", "shift"], key: "e" },
  } satisfies Keyboard.Shortcut,
  Duplicate: {
    macOS: { modifiers: ["cmd"], key: "d" },
    Windows: { modifiers: ["ctrl"], key: "d" },
  } satisfies Keyboard.Shortcut,
} as const;
