import { HistoryItemActions, NewTabActions, TabListItemActions } from "./actions";
import { HistoryItem, TabListItem } from "./list";

export class OperaActions {
  public static NewTab = NewTabActions;
  public static TabList = TabListItemActions;
  public static TabHistory = HistoryItemActions;
}

export class OperaListsItems {
  public static TabList = TabListItem;
  public static TabHistory = HistoryItem;
}
