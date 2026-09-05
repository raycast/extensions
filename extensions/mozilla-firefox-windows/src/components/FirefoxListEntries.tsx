import { Icon, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { HistoryItemAction, NewTabAction } from "./FirefoxActions";
import { HistoryEntry } from "../interfaces";

export function NewTabEntry({ searchText }: { searchText?: string }) {
  return (
    <List.Item
      title={searchText ? `Search "${searchText}"` : "Open Empty Tab"}
      icon={{ source: searchText ? Icon.MagnifyingGlass : Icon.Plus }}
      actions={<NewTabAction query={searchText} />}
    />
  );
}

export function HistoryListEntry({ entry }: { entry: HistoryEntry }) {
  return (
    <List.Item
      id={entry.id.toString()}
      title={entry.title || ""}
      subtitle={entry.url}
      icon={getFavicon(entry.url)}
      actions={<HistoryItemAction entry={entry} />}
    />
  );
}
