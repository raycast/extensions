import { List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookmarkListItem } from "./components/BookmarkListItem";
import { HistoryListItem } from "./components/HistoryListItem";
import { SuggestionListItem } from "./components/SuggestionListItem";
import { TabListItem } from "./components/TabListItem";
import { URLListItem } from "./components/URLListItem";
import withVersionCheck from "./components/VersionCheck";
import { useSearchHistory, useTabs, useBookmarks } from "./dia";
import { useGoogleSuggestions } from "./google";
import { filterHistory, filterTabs, isLikelyURL } from "./utils";

type ViewMode = "all" | "pinned-tabs" | "open-tabs" | "bookmarks" | "history" | "suggestions";

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    timer.current = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer.current);
  }, [value, delayMs]);

  return debounced;
}

function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const [viewMode, setViewMode] = useCachedState<ViewMode>("view-mode", "all");

  // Immediate: tabs filter + URL detection (cheap, local)
  // Debounced: history SQL + Google API + bookmarks file I/O (expensive)
  const debouncedSearch = useDebouncedValue(searchText, 200);

  const { isLoading: isLoadingTabs, data: tabs, revalidate: revalidateTabs } = useTabs();
  const { data: history, permissionView } = useSearchHistory(debouncedSearch);
  const { data: bookmarks } = useBookmarks(debouncedSearch);
  const { data: googleSuggestions } = useGoogleSuggestions(debouncedSearch);

  if (permissionView) {
    return permissionView;
  }

  // Tab filtering is instant (local array filter) — uses immediate searchText
  const filteredTabs = useMemo(() => filterTabs(tabs, searchText), [tabs, searchText]);
  const filteredHistory = useMemo(() => filterHistory(history, tabs), [history, tabs]);

  const shouldShow = (section: ViewMode) => viewMode === "all" || viewMode === section;
  const detectedURL = searchText && isLikelyURL(searchText) ? searchText.trim() : null;

  return (
    <List
      isLoading={isLoadingTabs}
      searchBarPlaceholder="Search tabs, bookmarks and browsing history..."
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
            <List.Dropdown.Item title="Bookmarks" value="bookmarks" />
            <List.Dropdown.Item title="History" value="history" />
            <List.Dropdown.Item title="Suggestions" value="suggestions" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {detectedURL && (
        <List.Section title="Open URL">
          <URLListItem url={detectedURL} searchText={searchText} />
        </List.Section>
      )}

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

      {shouldShow("bookmarks") && debouncedSearch && (
        <List.Section title="Bookmarks">
          {bookmarks?.map((bookmark) => (
            <BookmarkListItem
              key={`bookmark-${bookmark.id}`}
              item={{
                id: bookmark.id,
                name: bookmark.name,
                type: "url" as const,
                url: bookmark.url,
                path: bookmark.path.split(" › "),
                idPath: [],
              }}
            />
          ))}
        </List.Section>
      )}

      {shouldShow("history") && (
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

      {shouldShow("suggestions") && debouncedSearch && (
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
