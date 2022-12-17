import { HistoryItemActions, NewTabActions, TabListItemActions } from "./actions";
import { HistoryItem, TabListItem } from "./list";

export class IridiumActions {
  public static NewTab = NewTabActions;
  public static TabList = TabListItemActions;
  public static TabHistory = HistoryItemActions;
}

export class IridiumListsItems {
  public static TabList = TabListItem;
  public static TabHistory = HistoryItem;
}
