import { Icon } from "@raycast/api";
import { ActionType } from "../actionType";

export function getActionIcon(type: ActionType): Icon {
  switch (type) {
    case ActionType.OpenFolder:
      return Icon.Folder;
    case ActionType.OpenFile:
      return Icon.Finder;
    case ActionType.TerminalCommand:
      return Icon.Terminal;
    case ActionType.OpenApp:
      return Icon.AppWindowGrid2x2;
    case ActionType.Note:
      return Icon.Text;
    case ActionType.Link:
      return Icon.Link;
  }
}
