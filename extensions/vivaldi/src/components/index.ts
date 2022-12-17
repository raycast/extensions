import { HistoryItemActions, NewTabActions, TabListItemActions } from "./actions";
import { HistoryItem, TabListItem } from "./list";

export class VivaldiActions {
  public static NewTab = NewTabActions;
  public static TabList = TabListItemActions;
  public static TabHistory = HistoryItemActions;
}

export class VivaldiListsItems {
  public static TabList = TabListItem;
  public static TabHistory = HistoryItem;
}
