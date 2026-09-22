import { Icon, List } from "@raycast/api";
import { NewTabAction, HistoryItemAction } from "./FirefoxActions";
import { HistoryEntry } from "../interfaces";
import { looksLikeUrl } from "../actions";
import { getFavicon } from "@raycast/utils";

export const NewTabEntry = NewTabEntryComponent;
export const HistoryListEntry = HistoryListEntryComponent;

function NewTabEntryComponent({ searchText }: { searchText?: string }) {
  const title = !searchText ? "Open Empty Tab" : looksLikeUrl(searchText) ? "Open URL" : `Search "${searchText}"`;
  return (
    <List.Item
      id="new-tab"
      title={title}
      icon={{ source: !searchText ? Icon.Plus : looksLikeUrl(searchText) ? Icon.Link : Icon.MagnifyingGlass }}
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
