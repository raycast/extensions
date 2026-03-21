import { Icon, List } from "@raycast/api";
import { NewTabAction, HistoryItemAction, TabListItemAction } from "./FirefoxActions";
import { HistoryEntry, Tab, getUrlWithoutScheme, getTabFavicon } from "../interfaces";
import { getFavicon } from "@raycast/utils";

export const NewTabEntry = NewTabEntryComponent;
export const HistoryListEntry = HistoryListEntryComponent;
export const TabListEntry = TabListEntryComponent;

function NewTabEntryComponent({ searchText }: { searchText?: string }) {
  return (
    <List.Item
      title={!searchText ? "Open Empty Tab" : `Search "${searchText}"`}
      icon={{ source: !searchText ? Icon.Plus : Icon.MagnifyingGlass }}
      actions={<NewTabAction query={searchText} />}
    />
  );
}

function TabListEntryComponent({ tab }: { tab: Tab }) {
  return (
    <List.Item
      title={tab.title}
      subtitle={getUrlWithoutScheme(tab)}
      keywords={[getUrlWithoutScheme(tab)]}
      actions={<TabListItemAction tab={tab} />}
      icon={getTabFavicon(tab)}
    />
  );
}

function HistoryListEntryComponent({ entry: { url, title, id, lastVisited } }: { entry: HistoryEntry }) {
  return (
    <List.Item
      id={id.toString()}
      title={title || ""}
      subtitle={url}
      icon={getFavicon(url)}
      actions={<HistoryItemAction entry={{ url, title, id, lastVisited }} />}
    />
  );
}
