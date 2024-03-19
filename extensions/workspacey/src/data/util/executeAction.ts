import { open } from "@raycast/api";
import { exec } from "child_process";
import { ActionData } from "../action-data";
import { ActionType } from "../actionType";

export function executeAction(action: ActionData) {
  switch (action.type) {
    case ActionType.OpenFolder:
      open(action.target);
      break;
    case ActionType.OpenFile:
      if (action.useCustomApp) {
        open(action.target, action.argument);
      } else {
        open(action.target);
      }
      break;
    case ActionType.OpenApp:
      open(action.target);
      break;
    case ActionType.Link:
      if (action.useCustomApp) {
        open(action.target, action.argument);
      } else {
        open(action.target);
      }
      break;
    case ActionType.TerminalCommand:
      exec(action.target);
      break;
    default:
      break;
  }
}
