import { ActionPanel, getPreferenceValues, Icon, type LaunchProps, List } from "@raycast/api";
import { getFavicon, usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { OpenAsideUrlAction, OpenInDefaultBrowserAction, RefreshAction, UrlActions } from "./components/actions";
import { BookmarkListItem } from "./components/bookmark-list-item";
import { HistoryListItem } from "./components/history-list-item";
import { ProfileDropdown } from "./components/profile-dropdown";
import { TabListItem } from "./components/tab-list-item";
import { filterBookmarks, useProfileBookmarks } from "./lib/bookmarks";
import { SEARCH } from "./lib/constants";
import { useHistorySearch } from "./lib/history";
import { useAsideProfiles } from "./lib/profiles";
import { filterSearchable } from "./lib/search";
import { useSuggestions } from "./lib/suggestions";
import { getTabs } from "./lib/tabs";
import type { Suggestion } from "./lib/types";
import { extractDomain } from "./lib/url";

const BOOKMARK_PREVIEW_LIMIT = 5;

export default function SearchAside(props: LaunchProps) {
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const { profile: configuredProfile } = getPreferenceValues<Preferences.SearchWeb>();
  const { profile, setProfile, profiles, isLoading: isLoadingProfiles } = useAsideProfiles(configuredProfile);

  const { data: tabs, isLoading: isLoadingTabs, error: tabsError, mutate, revalidate } = usePromise(getTabs);
  const {
    sortedBookmarks,
    visitBookmark,
    isLoading: isLoadingBookmarks,
    error: bookmarksError,
    revalidate: revalidateBookmarks,
  } = useProfileBookmarks(profile);

  const pendingCloseIdsRef = useRef<Set<string>>(new Set());

  const {
    data: history,
    totalMatches: historyTotalMatches,
    error: historyError,
    isLoading: isLoadingHistory,
    permissionView,
    revalidate: revalidateHistory,
  } = useHistorySearch(searchText, 25, profile, { includeTotalMatches: true });
  const { data: suggestions, isLoading: isLoadingSuggestions } = useSuggestions(searchText);

  if (permissionView) return permissionView;

  const visibleTabs = (tabs ?? []).filter((tab) => !pendingCloseIdsRef.current.has(tab.id));
  const filteredTabs = filterSearchable(visibleTabs, searchText);
  const pinnedTabs = filteredTabs.filter((tab) => tab.isPinned);
  const unpinnedTabs = filteredTabs.filter((tab) => !tab.isPinned);
  const hasSearchText = searchText.trim().length > 0;
  const matchingBookmarks = filterBookmarks(sortedBookmarks, searchText);
  const visibleBookmarks = hasSearchText ? matchingBookmarks : matchingBookmarks.slice(0, BOOKMARK_PREVIEW_LIMIT);
  const bookmarksSubtitle =
    visibleBookmarks.length < matchingBookmarks.length
      ? `${visibleBookmarks.length} of ${matchingBookmarks.length}`
      : `${visibleBookmarks.length}`;

  const allSuggestions = suggestions ?? [];
  const urlSuggestions = allSuggestions.filter((s) => s.type === "url");
  const searchSuggestions = allSuggestions.filter((s) => s.type === "search");

  const isLoading =
    isLoadingTabs || isLoadingBookmarks || isLoadingHistory || isLoadingSuggestions || isLoadingProfiles;
  const isHistoryReady = !isLoadingTabs && !isLoadingHistory;

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search tabs, bookmarks, history, or the web…"
      searchBarAccessory={
        <ProfileDropdown profiles={profiles} value={profile} onChange={setProfile} tooltip="History Profile" />
      }
      filtering={false}
      throttle
    >
      {urlSuggestions.length > 0 && (
        <List.Section title="Open URL">
          {urlSuggestions.map((suggestion) => (
            <SuggestionListItem key={suggestion.id} suggestion={suggestion} />
          ))}
        </List.Section>
      )}

      {searchSuggestions.length > 0 && (
        <List.Section
          title="Search Suggestions"
          subtitle={`${searchSuggestions.length} suggestion${searchSuggestions.length === 1 ? "" : "s"}`}
        >
          {searchSuggestions.map((suggestion) => (
            <SuggestionListItem key={suggestion.id} suggestion={suggestion} />
          ))}
        </List.Section>
      )}

      {pinnedTabs.length > 0 && (
        <List.Section title="Pinned Tabs" subtitle={`${pinnedTabs.length}`}>
          {pinnedTabs.map((tab) => (
            <TabListItem
              key={tab.id}
              tab={tab}
              mutate={mutate}
              revalidate={revalidate}
              pendingCloseIdsRef={pendingCloseIdsRef}
            />
          ))}
        </List.Section>
      )}

      {!isLoadingBookmarks && bookmarksError && (
        <UnavailableSection
          title="Bookmarks"
          error={bookmarksError}
          refreshSubject="Bookmarks"
          revalidate={revalidateBookmarks}
        />
      )}

      {!isLoadingBookmarks && !bookmarksError && visibleBookmarks.length > 0 && (
        <List.Section title="Bookmarks" subtitle={bookmarksSubtitle}>
          {visibleBookmarks.map((bookmark) => (
            <BookmarkListItem
              key={bookmark.id}
              bookmark={bookmark}
              onOpen={() => visitBookmark(bookmark)}
              additionalActions={
                <ActionPanel.Section title="Bookmark">
                  <RefreshAction subject="Bookmarks" revalidate={revalidateBookmarks} />
                </ActionPanel.Section>
              }
            />
          ))}
        </List.Section>
      )}

      {!isLoadingTabs && tabsError && (
        <UnavailableSection title="Open Tabs" error={tabsError} refreshSubject="Tab List" revalidate={revalidate} />
      )}

      {unpinnedTabs.length > 0 && (
        <List.Section title="Open Tabs" subtitle={`${unpinnedTabs.length}`}>
          {unpinnedTabs.map((tab) => (
            <TabListItem
              key={tab.id}
              tab={tab}
              mutate={mutate}
              revalidate={revalidate}
              pendingCloseIdsRef={pendingCloseIdsRef}
            />
          ))}
        </List.Section>
      )}

      {isHistoryReady && historyError && (
        <UnavailableSection
          title="History"
          error={historyError}
          refreshSubject="History"
          revalidate={revalidateHistory}
        />
      )}

      {isHistoryReady && !historyError && history.length > 0 && (
        <List.Section
          title="History"
          subtitle={
            history.length < historyTotalMatches
              ? `${history.length} of ${historyTotalMatches.toLocaleString()}`
              : `${history.length}`
          }
        >
          {history.map((entry) => (
            <HistoryListItem key={entry.id} entry={entry} revalidate={revalidateHistory} />
          ))}
        </List.Section>
      )}

      {!isLoading && !hasSearchText && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search the Web"
          description={`Type a query and hit ↩︎ to search ${SEARCH.name}.`}
        />
      )}
    </List>
  );
}

function UnavailableSection({
  title,
  error,
  refreshSubject,
  revalidate,
}: {
  title: string;
  error: Error;
  refreshSubject: string;
  revalidate: () => Promise<unknown>;
}) {
  return (
    <List.Section title={title}>
      <List.Item
        icon={Icon.Warning}
        title={`${title} Unavailable`}
        subtitle={error.message}
        actions={
          <ActionPanel>
            <RefreshAction subject={refreshSubject} revalidate={revalidate} />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}

function SuggestionListItem({ suggestion }: { suggestion: Suggestion }) {
  const isUrl = suggestion.type === "url";
  return (
    <List.Item
      icon={isUrl ? getFavicon(suggestion.url, { fallback: Icon.Globe }) : Icon.MagnifyingGlass}
      title={suggestion.query}
      subtitle={isUrl ? extractDomain(suggestion.url) : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenAsideUrlAction
              title={isUrl ? "Open URL in Aside" : `Search ${SEARCH.name}`}
              url={suggestion.url}
              icon={isUrl ? Icon.Globe : Icon.MagnifyingGlass}
            />
            <OpenInDefaultBrowserAction url={suggestion.url} />
          </ActionPanel.Section>
          <UrlActions url={suggestion.url} title={suggestion.query} />
        </ActionPanel>
      }
    />
  );
}
