import { List } from "@raycast/api";
import { useMemo, useState } from "react";
import { useTabs, useSearchHistory } from "./dia";
import { useGoogleSuggestions } from "./google";
import { TabListItem } from "./components/TabListItem";
import { HistoryListItem } from "./components/HistoryListItem";
import { SuggestionListItem } from "./components/SuggestionListItem";
import { filterTabs, filterHistory } from "./utils";

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const { isLoading: isLoadingTabs, data: tabs } = useTabs();
  const { isLoading: isLoadingHistory, data: history, permissionView } = useSearchHistory(searchText);
  const { isLoading: isLoadingGoogleSuggestions, data: googleSuggestions } = useGoogleSuggestions(searchText);

  if (permissionView) {
    return permissionView;
  }

  const filteredTabs = useMemo(() => filterTabs(tabs, searchText), [tabs, searchText]);
  const filteredHistory = useMemo(() => filterHistory(history, tabs), [history, tabs]);

  return (
    <List
      isLoading={isLoadingTabs || isLoadingHistory || isLoadingGoogleSuggestions}
      searchBarPlaceholder="Search your open tabs and browsing history..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      <List.Section title="Pinned Tabs">
        {filteredTabs
          ?.filter((tab) => tab.isPinned)
          ?.map((tab, index) => <TabListItem key={`pinned-tab-${tab.windowId}-${tab.tabId}-${index}`} tab={tab} />)}
      </List.Section>

      <List.Section title="Open Tabs">
        {filteredTabs
          ?.filter((tab) => !tab.isPinned)
          ?.map((tab, index) => <TabListItem key={`open-tab-${tab.windowId}-${tab.tabId}-${index}`} tab={tab} />)}
      </List.Section>

      {!isLoadingTabs && (
        <List.Section title="History">
          {filteredHistory?.map((item) => <HistoryListItem key={`history-${item.id}`} item={item} />)}
        </List.Section>
      )}

      {!isLoadingTabs && searchText && (
        <List.Section title="Google Suggestions">
          {googleSuggestions?.map((suggestion) => <SuggestionListItem key={suggestion.id} suggestion={suggestion} />)}
        </List.Section>
      )}
    </List>
  );
}
