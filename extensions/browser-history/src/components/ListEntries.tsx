import { List } from "@raycast/api";
import { BrowserHistoryActions } from "./index";
import { HistoryEntry } from "../interfaces";
import { getFavicon } from "@raycast/utils";

export class ListEntries {
  public static HistoryEntry = HistoryListEntry;
}

function HistoryListEntry({ entry: { url, title, id, lastVisited, browser } }: { entry: HistoryEntry }) {
  return (
    <List.Item
      id={id.toString()}
      title={title || ""}
      subtitle={url}
      icon={getFavicon(url)}
      actions={<BrowserHistoryActions.HistoryItem entry={{ url, title, id, lastVisited, browser }} />}
    />
  );
}
