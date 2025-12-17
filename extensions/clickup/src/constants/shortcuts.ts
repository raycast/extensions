import { Keyboard } from "@raycast/api";

export const Shortcuts = {
  ChangeStatus: { key: "t", modifiers: ["cmd", "shift"] },
  CopyId: { key: ".", modifiers: ["cmd", "shift"] },
  CopyMarkdown: { key: "c", modifiers: ["cmd", "shift"] },
  CopyMarkdownUrl: { key: ";", modifiers: ["cmd", "shift"] },
  CopyUrl: { key: ",", modifiers: ["cmd", "shift"] },
  GoToParentTask: { key: "p", modifiers: ["cmd", "shift"] },
  NextStatus: { key: "n", modifiers: ["cmd", "shift"] },
  OpenInBrowser: { key: "return", modifiers: ["shift"] },
  ShowSubtasks: { key: "s", modifiers: ["cmd", "shift"] },
} as const satisfies Record<string, Keyboard.Shortcut>;
