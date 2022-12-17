import { useEffect, useState, ReactElement } from "react";
import { getPreferenceValues, Icon, List } from "@raycast/api";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { Tab } from "./interfaces";
import { getOpenTabs } from "./actions";
import { IridiumActions, IridiumListsItems } from "./components";

export default function Command(): ReactElement {
  const [tabsLoading, setTabsLoading] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>();
  const [tabs, setTabs] = useState<Tab[]>([]);
  const { isLoading, permissionView, data } = useHistorySearch(searchText);

  const { useOriginalFavicon } = getPreferenceValues<{ useOriginalFavicon: boolean }>();

  async function getTabs(query?: string) {
    let tabs = await getOpenTabs(useOriginalFavicon);

    if (query) {
      tabs = tabs.filter(function (tab) {
        return (
          tab.title.toLowerCase().includes(query.toLowerCase()) ||
          tab.urlWithoutScheme().toLowerCase().includes(query.toLowerCase())
        );
      });
    }
    setTabs(tabs);
  }

  useEffect(() => {
    setTabsLoading(true);
    getTabs().then(() => setTabsLoading(false));
  }, [searchText]);

  if (permissionView) {
    return permissionView as ReactElement;
  }

  return (
    <List onSearchTextChange={setSearchText} isLoading={isLoading || tabsLoading}>
      <List.Section key={"new-tab"} title={"New Tab"}>
        <List.Item
          title={!searchText ? "Open Empty Tab" : `Search "${searchText}"`}
          icon={{ source: !searchText ? Icon.Plus : Icon.MagnifyingGlass }}
          actions={<IridiumActions.NewTab query={searchText} />}
        />
      </List.Section>
      <List.Section key={"open-tabs"} title={"Open Tabs"}>
        {tabs.map((tab) => (
          <IridiumListsItems.TabList key={tab.key()} tab={tab} useOriginalFavicon={useOriginalFavicon} />
        ))}
      </List.Section>
      <List.Section key={"history"} title={"Recently Closed"}>
        {data?.map((e) => (
          <IridiumListsItems.TabHistory entry={e} key={e.id} />
        ))}
      </List.Section>
    </List>
  );
}
