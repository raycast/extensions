import { Icon, List } from "@raycast/api";
import { Actions } from "./index";
import { HistoryEntry, Tab } from "../interfaces";
import { getFavicon } from "@raycast/utils";

export const NewTabEntry = ({ searchText }: { searchText?: string }) => (
  <List.Item
    title={!searchText ? "Open Empty Tab" : `Search "${searchText}"`}
    icon={{ source: !searchText ? Icon.Plus : Icon.MagnifyingGlass }}
    actions={<Actions.NewTab query={searchText} />}
  />
);

export const TabListEntry = ({ tab }: { tab: Tab }) => (
  <List.Item
    title={tab.title}
    subtitle={tab.urlWithoutScheme()}
    keywords={[tab.urlWithoutScheme()]}
    actions={<Actions.TabListItem tab={tab} />}
    icon={tab.googleFavicon()}
  />
);

export const HistoryListEntry = ({ entry: { url, title, id, lastVisited } }: { entry: HistoryEntry }) => (
  <List.Item
    id={id.toString()}
    title={title}
    subtitle={url}
    icon={getFavicon(url)}
    actions={<Actions.HistoryItem entry={{ url, title, id, lastVisited }} />}
  />
);
