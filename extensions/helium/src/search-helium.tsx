import { countOf } from "@chrismessina/raycast-kit/plural";
import { Action, ActionPanel, Icon, LaunchProps, List } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { getBookmarks } from "./utils/bookmarks";
import { useHistorySearch } from "./utils/history";
import { ReloadAction } from "./utils/actions";
import { BookmarkListItem, HistoryListItem, SuggestionListItem, TabListItem } from "./utils/list-items";
import { filterPendingCloseTabs, releaseConfirmedPendingCloseIds, sharedPendingCloseIds } from "./utils/pending-close";
import { filterSearchable } from "./utils/search";
import { partitionSearchWebSuggestions } from "./utils/search-web-results";
import { useSuggestions } from "./utils/suggestions";
import {
  excludeOpenTabUrls,
  isSearchHeliumViewMode,
  SEARCH_HELIUM_VIEW_MODES,
  shouldShowSection,
  type SearchHeliumViewMode,
} from "./utils/unified-search";
import { useCachedBrowserTabs } from "./utils/use-cached-browser-tabs";

const HISTORY_LIMIT = 25;
// Fetch extra rows so hiding pages that are already open still leaves a full
// History section (recent history is often mostly the tabs open right now).
const HISTORY_FETCH_LIMIT = HISTORY_LIMIT * 2;
const FULL_DISK_ACCESS_SETTINGS = "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles";

export default function SearchHelium(props: LaunchProps) {
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const [storedViewMode, setViewMode] = useCachedState<string>("search-helium-view-mode", "all");
  // Validate on read too, so a stale cached value can never hide every section.
  const viewMode: SearchHeliumViewMode = isSearchHeliumViewMode(storedViewMode) ? storedViewMode : "all";

  const showTabs = shouldShowSection("tabs", viewMode, searchText);
  const showBookmarks = shouldShowSection("bookmarks", viewMode, searchText);
  const showHistory = shouldShowSection("history", viewMode, searchText);
  const showWeb = shouldShowSection("web", viewMode, searchText);

  // Tabs: same cached snapshot + pending-close handling as Search Tabs.
  const { data: tabs, freshTabs, isLoading: isLoadingTabs, mutate, revalidate } = useCachedBrowserTabs();
  const pendingCloseIdsRef = useRef(sharedPendingCloseIds);

  useEffect(() => {
    if (freshTabs) releaseConfirmedPendingCloseIds(pendingCloseIdsRef.current, freshTabs);
  }, [freshTabs]);

  const visibleTabs = filterPendingCloseTabs(tabs, pendingCloseIdsRef.current);
  const filteredTabs = useMemo(() => filterSearchable(visibleTabs, searchText), [visibleTabs, searchText]);

  // Bookmarks: read once from the profile's Bookmarks file, filtered locally.
  const {
    data: bookmarks,
    error: bookmarksError,
    isLoading: isLoadingBookmarks,
    revalidate: revalidateBookmarks,
  } = usePromise(getBookmarks, [], {
    failureToastOptions: { title: "Failed to Load Bookmarks" },
  });
  const filteredBookmarks = useMemo(
    () => (bookmarks ? filterSearchable(bookmarks, searchText) : []),
    [bookmarks, searchText],
  );

  // History is optional: a missing, unreadable or permission-blocked History
  // database only affects the History section, never tabs and bookmarks.
  const {
    data: history,
    isAvailable: isHistoryAvailable,
    isLoading: isLoadingHistory,
    permissionView,
    revalidate: revalidateHistory,
  } = useHistorySearch(searchText, HISTORY_FETCH_LIMIT);
  const needsHistoryPermission = !!permissionView;
  // Only de-duplicate against tabs shown alongside history ("All"), so the
  // History filter still lists pages that happen to be open.
  const filteredHistory = useMemo(
    () => (viewMode === "all" ? excludeOpenTabUrls(history, filteredTabs) : history).slice(0, HISTORY_LIMIT),
    [history, filteredTabs, viewMode],
  );

  // Web: Helium's search provider, bangs and direct URLs, as in Search Web.
  const { data: suggestions, isLoading: isLoadingSuggestions } = useSuggestions(showWeb ? searchText : "");
  const { bangSuggestions, webSuggestions, urlSuggestions } = partitionSearchWebSuggestions(suggestions);

  const isLoading =
    (showTabs && isLoadingTabs) ||
    (showBookmarks && isLoadingBookmarks) ||
    (showHistory && isLoadingHistory) ||
    (showWeb && isLoadingSuggestions);

  const hasResults =
    (showTabs && filteredTabs.length > 0) ||
    (showBookmarks && filteredBookmarks.length > 0) ||
    (showHistory && !needsHistoryPermission && filteredHistory.length > 0) ||
    (showWeb && suggestions.length > 0);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search tabs, bookmarks and history..."
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Results"
          value={viewMode}
          onChange={(value) => setViewMode(isSearchHeliumViewMode(value) ? value : "all")}
        >
          <List.Dropdown.Section>
            <List.Dropdown.Item title={SEARCH_HELIUM_VIEW_MODES[0].title} value={SEARCH_HELIUM_VIEW_MODES[0].value} />
          </List.Dropdown.Section>
          <List.Dropdown.Section>
            {SEARCH_HELIUM_VIEW_MODES.slice(1).map((mode) => (
              <List.Dropdown.Item key={mode.value} title={mode.title} value={mode.value} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {/* useSQL's own permission screen would replace the whole list (and the
          dropdown), so the History filter shows its own empty state instead. */}
      {viewMode === "history" && needsHistoryPermission ? (
        <List.EmptyView
          icon={Icon.Lock}
          title="Full Disk Access Required"
          description="Raycast needs Full Disk Access to read Helium's browsing history. Pick another filter to keep searching tabs and bookmarks."
          actions={
            <ActionPanel>
              <Action.Open title="Open Privacy Settings" icon={Icon.Gear} target={FULL_DISK_ACCESS_SETTINGS} />
            </ActionPanel>
          }
        />
      ) : viewMode === "bookmarks" && bookmarksError ? (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="Failed to Load Bookmarks"
          description="There was an error reading your Helium bookmarks file. Make sure Helium is installed, then reload."
          actions={
            <ActionPanel>
              <ReloadAction subject="Bookmarks" revalidate={revalidateBookmarks} />
            </ActionPanel>
          }
        />
      ) : viewMode === "history" && !isHistoryAvailable ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="History Unavailable"
          description="No readable Helium History database was found"
        />
      ) : (
        !hasResults &&
        !isLoading && (
          <List.EmptyView
            icon={Icon.MagnifyingGlass}
            title={searchText.trim() ? "Nothing Found" : "Start Typing to Search"}
            description="Search open tabs, bookmarks and browsing history in Helium"
          />
        )
      )}

      {/* Explicit intent (a typed URL or a bang) comes first, as in Dia's Search. */}
      {showWeb && urlSuggestions.length > 0 && (
        <List.Section title="Open URL">
          {urlSuggestions.map((suggestion) => (
            <SuggestionListItem key={suggestion.id} suggestion={suggestion} />
          ))}
        </List.Section>
      )}

      {showWeb && bangSuggestions.length > 0 && (
        <List.Section title="Bangs">
          {bangSuggestions.map((suggestion) => (
            <SuggestionListItem key={suggestion.id} suggestion={suggestion} />
          ))}
        </List.Section>
      )}

      {showTabs && filteredTabs.length > 0 && (
        <List.Section title="Open Tabs" subtitle={countOf(filteredTabs.length, "tab")}>
          {filteredTabs.map((tab) => (
            <TabListItem
              key={tab.id}
              tab={tab}
              tabs={visibleTabs}
              mutate={mutate}
              revalidate={revalidate}
              pendingCloseIdsRef={pendingCloseIdsRef}
            />
          ))}
        </List.Section>
      )}

      {showBookmarks && filteredBookmarks.length > 0 && (
        <List.Section title="Bookmarks" subtitle={countOf(filteredBookmarks.length, "bookmark")}>
          {filteredBookmarks.map((bookmark) => (
            <BookmarkListItem
              key={bookmark.id}
              bookmark={bookmark}
              revalidate={revalidateBookmarks}
              tabContext={{ tabs: visibleTabs, mutate, revalidate, pendingCloseIdsRef }}
            />
          ))}
        </List.Section>
      )}

      {showHistory && !needsHistoryPermission && filteredHistory.length > 0 && (
        <List.Section
          title={searchText.trim() ? "History" : "Recent History"}
          subtitle={countOf(filteredHistory.length, "entry")}
        >
          {filteredHistory.map((entry) => (
            <HistoryListItem key={entry.id} entry={entry} revalidate={revalidateHistory} />
          ))}
        </List.Section>
      )}

      {showWeb && webSuggestions.length > 0 && (
        <List.Section title="Search Web" subtitle={countOf(webSuggestions.length, "result")}>
          {webSuggestions.map((suggestion) => (
            <SuggestionListItem key={suggestion.id} suggestion={suggestion} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
