import { Icon, List } from "@raycast/api";
import { NewTabAction, HistoryItemAction } from "./FirefoxActions";
import { HistoryEntry } from "../interfaces";
import { looksLikeUrl, newTabTitle } from "../actions";
import { NEW_TAB_ITEM_ID } from "../hooks/useEditUrlInSearch";
import { getFavicon } from "@raycast/utils";

export const NewTabEntry = NewTabEntryComponent;
export const HistoryListEntry = HistoryListEntryComponent;

function NewTabEntryComponent({ searchText }: { searchText?: string }) {
  const trimmed = searchText?.trim();
  const asUrl = Boolean(trimmed && looksLikeUrl(trimmed));
  return (
    <List.Item
      id={NEW_TAB_ITEM_ID}
      title={newTabTitle(searchText)}
      icon={{ source: !trimmed ? Icon.Plus : asUrl ? Icon.Link : Icon.MagnifyingGlass }}
      actions={<NewTabAction query={searchText} />}
    />
  );
}

function HistoryListEntryComponent({ entry, onEditUrl }: { entry: HistoryEntry; onEditUrl?: (url: string) => void }) {
  const { url, title, id } = entry;
  return (
    <List.Item
      id={id.toString()}
      title={title || ""}
      subtitle={url}
      icon={getFavicon(url)}
      actions={<HistoryItemAction entry={entry} onEditUrl={onEditUrl} />}
    />
  );
}
