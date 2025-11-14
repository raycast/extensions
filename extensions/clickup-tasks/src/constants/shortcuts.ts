import { Action } from "@raycast/api";
type Shortcut =
  | Action.CopyToClipboard.Props["shortcut"]
  | Action.OpenInBrowser.Props["shortcut"]
  | Action.Push.Props["shortcut"];

const CMD_SHIFT_C: Shortcut = { key: "c", modifiers: ["cmd", "shift"] };
const CMD_SHIFT_COMMA: Shortcut = { key: ",", modifiers: ["cmd", "shift"] };
const CMD_SHIFT_N: Shortcut = { key: "n", modifiers: ["cmd", "shift"] };
const CMD_SHIFT_P: Shortcut = { key: "p", modifiers: ["cmd", "shift"] };
const CMD_SHIFT_PERIOD: Shortcut = { key: ".", modifiers: ["cmd", "shift"] };
const CMD_SHIFT_S: Shortcut = { key: "s", modifiers: ["cmd", "shift"] };
const CMD_SHIFT_SEMICOLON: Shortcut = { key: ";", modifiers: ["cmd", "shift"] };
const CMD_SHIFT_T: Shortcut = { key: "t", modifiers: ["cmd", "shift"] };
const SHIFT_ENTER: Shortcut = { key: "enter", modifiers: ["shift"] };

export const Shortcuts = {
  ChangeStatus: CMD_SHIFT_T,
  CopyId: CMD_SHIFT_PERIOD,
  CopyMarkdown: CMD_SHIFT_C,
  CopyMarkdownUrl: CMD_SHIFT_SEMICOLON,
  CopyUrl: CMD_SHIFT_COMMA,
  GoToParentTask: CMD_SHIFT_P,
  NextStatus: CMD_SHIFT_N,
  OpenInBrowser: SHIFT_ENTER,
  ShowSubtasks: CMD_SHIFT_S,
};
