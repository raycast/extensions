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
  OpenLibrary: {
    macOS: { modifiers: ["cmd"], key: "l" },
    Windows: { modifiers: ["ctrl"], key: "l" },
  } satisfies Keyboard.Shortcut,
} as const;
