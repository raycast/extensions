import { Action } from "./action";
import { ActionType } from "./actionType";

export const ACTIONS: Action[] = [
  { type: ActionType.OpenFile, name: "Open File" },
  { type: ActionType.OpenFolder, name: "Open Folder" },
  { type: ActionType.OpenApp, name: "Open App" },
  { type: ActionType.Link, name: "Link" },
  { type: ActionType.TerminalCommand, name: "Terminal Command" },
  { type: ActionType.Note, name: "Note" },
];
