import { List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useMemo, useState } from "react";
import { HistoryListItem } from "./components/HistoryListItem";
import { SuggestionListItem } from "./components/SuggestionListItem";
import { TabListItem } from "./components/TabListItem";
import withVersionCheck from "./components/VersionCheck";
import { useSearchHistory, useTabs } from "./dia";
import { useGoogleSuggestions } from "./google";
import { filterHistory, filterTabs } from "./utils";

type ViewMode = "all" | "pinned-tabs" | "open-tabs" | "history" | "suggestions";

function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const [viewMode, setViewMode] = useCachedState<ViewMode>("view-mode", "all");

  const { isLoading: isLoadingTabs, data: tabs, revalidate: revalidateTabs } = useTabs();
  const { isLoading: isLoadingHistory, data: history, permissionView } = useSearchHistory(searchText);
  const { isLoading: isLoadingGoogleSuggestions, data: googleSuggestions } = useGoogleSuggestions(searchText);

  if (permissionView) {
    return permissionView;
  }

  const filteredTabs = useMemo(() => filterTabs(tabs, searchText), [tabs, searchText]);
  const filteredHistory = useMemo(() => filterHistory(history, tabs), [history, tabs]);

  const shouldShow = (section: ViewMode) => viewMode === "all" || viewMode === section;

  return (
    <List
      isLoading={isLoadingTabs || isLoadingHistory || isLoadingGoogleSuggestions}
      searchBarPlaceholder="Search your open tabs and browsing history..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter View"
          value={viewMode}
          onChange={(newValue) => setViewMode(newValue as ViewMode)}
        >
          <List.Dropdown.Section>
            <List.Dropdown.Item title="All" value="all" />
          </List.Dropdown.Section>
          <List.Dropdown.Section>
            <List.Dropdown.Item title="Pinned Tabs" value="pinned-tabs" />
            <List.Dropdown.Item title="Open Tabs" value="open-tabs" />
            <List.Dropdown.Item title="History" value="history" />
            <List.Dropdown.Item title="Suggestions" value="suggestions" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {shouldShow("pinned-tabs") && (
        <List.Section title="Pinned Tabs">
          {filteredTabs
            ?.filter((tab) => tab.isPinned)
            ?.map((tab, index) => (
              <TabListItem
                key={`pinned-tab-${tab.windowId}-${tab.tabId}-${index}`}
                tab={tab}
                searchText={searchText}
                onTabAction={revalidateTabs}
              />
            ))}
        </List.Section>
      )}

      {shouldShow("open-tabs") && (
        <List.Section title="Open Tabs">
          {filteredTabs
            ?.filter((tab) => !tab.isPinned)
            ?.map((tab, index) => (
              <TabListItem
                key={`open-tab-${tab.windowId}-${tab.tabId}-${index}`}
                tab={tab}
                searchText={searchText}
                onTabAction={revalidateTabs}
              />
            ))}
        </List.Section>
      )}

      {shouldShow("history") && !isLoadingTabs && (
        <List.Section title="History">
          {filteredHistory?.map((item) => (
            <HistoryListItem
              key={`history-${item.id}`}
              item={item}
              searchText={searchText}
              onHistoryAction={revalidateTabs}
            />
          ))}
        </List.Section>
      )}

      {shouldShow("suggestions") && !isLoadingTabs && searchText && (
        <List.Section title="Google Suggestions">
          {googleSuggestions?.map((suggestion) => (
            <SuggestionListItem key={suggestion.id} suggestion={suggestion} onSuggestionAction={revalidateTabs} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export default withVersionCheck(Command);
