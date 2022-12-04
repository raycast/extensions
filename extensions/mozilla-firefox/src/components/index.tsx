import { NewTabAction, HistoryItemAction, TabListItemAction } from "./actions";
import { NewTabEntry, HistoryListEntry, TabListEntry } from "./list";

export class Actions {
  public static NewTab = NewTabAction;
  public static HistoryItem = HistoryItemAction;
  public static TabListItem = TabListItemAction;
}

export class ListEntries {
  public static NewTabEntry = NewTabEntry;
  public static HistoryEntry = HistoryListEntry;
  public static TabListEntry = TabListEntry;
}
