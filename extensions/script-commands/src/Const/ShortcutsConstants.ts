import { KeyboardShortcut } from "@raycast/api";

interface Constants {
  ClearFilter: KeyboardShortcut;
  Languages: KeyboardShortcut;
  Type: KeyboardShortcut;
  Uninstall: KeyboardShortcut;
  ViewReadmeInBrowser: KeyboardShortcut;
  ViewReadme: KeyboardShortcut;
  ViewSourceCodeInBrowser: KeyboardShortcut;
  ViewSourceCode: KeyboardShortcut;
}

export const ShortcutConstants: Constants = {
  ClearFilter: {
    modifiers: ["cmd", "shift"],
    key: "c",
  },
  Languages: {
    modifiers: ["cmd"],
    key: "l",
  },
  Type: {
    modifiers: ["cmd"],
    key: "t",
  },
  Uninstall: {
    modifiers: ["ctrl"],
    key: "x",
  },
  ViewReadmeInBrowser: {
    modifiers: ["cmd"],
    key: "o",
  },
  ViewReadme: {
    modifiers: ["cmd", "shift"],
    key: "r",
  },
  ViewSourceCodeInBrowser: {
    modifiers: ["cmd"],
    key: "o",
  },
  ViewSourceCode: {
    modifiers: ["cmd", "shift"],
    key: "s",
  },
};
