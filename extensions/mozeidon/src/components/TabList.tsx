import { Icon, List } from "@raycast/api";
import { TabActions } from "./index";
import { Tab } from "../interfaces";
import { SEARCH_ENGINE, TAB_TYPE } from "../constants";

type NewTabItemProps = { searchText?: string };
type TabItemProps = {
  isLoading: boolean;
  type: TAB_TYPE;
  tab: Tab;
  onCloseTab: (() => void) | undefined;
};

export class TabList {
  public static NewTabItem = NewTabItem;
  public static TabItem = TabItem;
}

function NewTabItem({ searchText }: NewTabItemProps) {
  return (
    <List.Item
      title={!searchText ? "Open Empty Tab" : `Search ${SEARCH_ENGINE} "${searchText}"`}
      icon={{ source: !searchText ? Icon.Plus : Icon.MagnifyingGlass }}
      actions={<TabActions.NewTab query={searchText} />}
    />
  );
}

function TabItem({ isLoading, type, tab, onCloseTab }: TabItemProps) {
  return (
    <List.Item
      id={tab.id.toString()}
      title={tab.title}
      subtitle={`${(tab.pinned ? "📌 " : "") + tab.domain}`}
      keywords={[tab.domain, tab.urlWithoutScheme()]}
      actions={<TabActions.OpenTabListItem tab={tab} type={type} isLoading={isLoading} onCloseTab={onCloseTab} />}
      icon={tab.googleFavicon()}
    />
  );
}
