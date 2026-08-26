import { ActionPanel, getPreferenceValues, Icon, type LaunchProps, List } from "@raycast/api";
import { getFavicon, usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { OpenAsideUrlAction, OpenInDefaultBrowserAction, RefreshAction, UrlActions } from "./components/actions";
import { HistoryListItem } from "./components/history-list-item";
import { ProfileDropdown } from "./components/profile-dropdown";
import { TabListItem } from "./components/tab-list-item";
import { SEARCH } from "./lib/constants";
import { useHistorySearch } from "./lib/history";
import { useAsideProfiles } from "./lib/profiles";
import { filterSearchable } from "./lib/search";
import { useSuggestions } from "./lib/suggestions";
import { getTabs } from "./lib/tabs";
import type { Suggestion } from "./lib/types";
import { extractDomain } from "./lib/url";

export default function SearchWeb(props: LaunchProps) {
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const { profile: configuredProfile } = getPreferenceValues<Preferences.SearchWeb>();
  const { profile, setProfile, profiles, isLoading: isLoadingProfiles } = useAsideProfiles(configuredProfile);

  const { data: tabs, isLoading: isLoadingTabs, error: tabsError, mutate, revalidate } = usePromise(getTabs);

  const pendingCloseIdsRef = useRef<Set<string>>(new Set());

  const {
    data: history,
    error: historyError,
    isLoading: isLoadingHistory,
    permissionView,
    revalidate: revalidateHistory,
  } = useHistorySearch(searchText, 25, profile);
  const { data: suggestions, isLoading: isLoadingSuggestions } = useSuggestions(searchText);

  if (permissionView) return permissionView;

  const visibleTabs = (tabs ?? []).filter((tab) => !pendingCloseIdsRef.current.has(tab.id));
  const filteredTabs = filterSearchable(visibleTabs, searchText);
  const pinnedTabs = filteredTabs.filter((tab) => tab.isPinned);
  const otherTabs = filteredTabs.filter((tab) => !tab.isPinned);

  const allSuggestions = suggestions ?? [];
  const urlSuggestions = allSuggestions.filter((s) => s.type === "url");
  const searchSuggestions = allSuggestions.filter((s) => s.type === "search");

  const isLoading = isLoadingTabs || isLoadingHistory || isLoadingSuggestions || isLoadingProfiles;
  const isHistoryReady = !isLoadingTabs && !isLoadingHistory;

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search tabs, history, or the web…"
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

      {!isLoadingTabs && tabsError && (
        <List.Section title="Open Tabs">
          <List.Item
            icon={Icon.Warning}
            title="Open Tabs Unavailable"
            subtitle={tabsError.message}
            actions={
              <ActionPanel>
                <RefreshAction subject="Tab List" revalidate={revalidate} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {otherTabs.length > 0 && (
        <List.Section title="Other Tabs" subtitle={`${otherTabs.length}`}>
          {otherTabs.map((tab) => (
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
        <List.Section title="History">
          <List.Item
            icon={Icon.Warning}
            title="History Unavailable"
            subtitle={historyError.message}
            actions={
              <ActionPanel>
                <RefreshAction subject="History" revalidate={revalidateHistory} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {isHistoryReady && !historyError && history.length > 0 && (
        <List.Section title="History" subtitle={`${history.length}`}>
          {history.map((entry) => (
            <HistoryListItem key={entry.id} entry={entry} revalidate={revalidateHistory} />
          ))}
        </List.Section>
      )}

      {!isLoading && searchText.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search the Web"
          description={`Type a query and hit ↩︎ to search ${SEARCH.name}.`}
        />
      )}
    </List>
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
