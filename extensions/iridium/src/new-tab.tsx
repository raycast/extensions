import { useState } from "react";
import { getPreferenceValues, Icon, List } from "@raycast/api";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { IridiumActions, IridiumListsItems } from "./components";
import { useTabSearch } from "./hooks/useTabSearch";

export default function Command() {
  const [searchText, setSearchText] = useState<string>();
  const { data: dataHistory, isLoading: isLoadingHistory, errorView: errorViewHistory } = useHistorySearch(searchText);
  const { data: dataTab, isLoading: isLoadingTab, errorView: errorViewTab } = useTabSearch();

  const { useOriginalFavicon } = getPreferenceValues<{ useOriginalFavicon: boolean }>();

  if (errorViewHistory || errorViewTab) {
    return errorViewHistory || errorViewTab;
  }

  return (
    <List onSearchTextChange={setSearchText} isLoading={isLoadingTab || isLoadingHistory}>
      <List.Section key={"new-tab"} title={"New Tab"}>
        <List.Item
          title={!searchText ? "Open Empty Tab" : `Search "${searchText}"`}
          icon={{ source: !searchText ? Icon.Plus : Icon.MagnifyingGlass }}
          actions={<IridiumActions.NewTab query={searchText} />}
        />
      </List.Section>
      <List.Section key={"open-tabs"} title={"Open Tabs"}>
        {dataTab?.map((tab) => (
          <IridiumListsItems.TabList key={tab.key()} tab={tab} useOriginalFavicon={useOriginalFavicon} />
        ))}
      </List.Section>
      <List.Section key={"history"} title={"Recently Closed"}>
        {dataHistory?.map((e) => (
          <IridiumListsItems.TabHistory entry={e} key={e.id} />
        ))}
      </List.Section>
    </List>
  );
}
