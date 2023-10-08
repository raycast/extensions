import { Icon, List } from "@raycast/api";
import { FirefoxActions } from "./index";
import { HistoryEntry, Tab } from "../interfaces";
import { getFavicon } from "@raycast/utils";

export class FirefoxListEntries {
  public static NewTabEntry = NewTabEntry;
  public static HistoryEntry = HistoryListEntry;
  public static TabListEntry = TabListEntry;
}

function NewTabEntry({ searchText }: { searchText?: string }) {
  return (
    <List.Item
      title={!searchText ? "Open Empty Tab" : `Search "${searchText}"`}
      icon={{ source: !searchText ? Icon.Plus : Icon.MagnifyingGlass }}
      actions={<FirefoxActions.NewTab query={searchText} />}
    />
  );
}

function TabListEntry({ tab }: { tab: Tab }) {
  return (
    <List.Item
      title={tab.title}
      subtitle={tab.urlWithoutScheme()}
      keywords={[tab.urlWithoutScheme()]}
      actions={<FirefoxActions.TabListItem tab={tab} />}
      icon={tab.googleFavicon()}
    />
  );
}

function HistoryListEntry({ entry: { url, title, id, lastVisited } }: { entry: HistoryEntry }) {
  return (
    <List.Item
      id={id.toString()}
      title={title || ""}
      subtitle={url}
      icon={getFavicon(url)}
      actions={<FirefoxActions.HistoryItem entry={{ url, title, id, lastVisited }} />}
    />
  );
}
