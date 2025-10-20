import { List, Action, ActionPanel, Icon, LaunchProps } from "@raycast/api";
import { getFavicon, usePromise } from "@raycast/utils";
import { useState, useRef } from "react";
import { getBrowserTabs, isBrowserExtensionAvailable } from "./utils/browser";
import { useHistorySearch } from "./utils/history";
import { useSuggestions, getSearchEngineName } from "./utils/suggestions";
import { normalizeURL, extractDomain } from "./utils/url";
import type { Tab, HistoryEntry, Suggestion } from "./types";
import {
  SwitchToTabAction,
  OpenNewTabAction,
  CloseTabAction,
  OpenInNewTabAction,
  CopyUrlAction,
  CopyAsMarkdownAction,
  CreateQuicklinkAction,
} from "./utils/actions";
import { filterSearchable } from "./utils/search";

export default function SearchWeb(props: LaunchProps) {
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");

  // Fetch tabs if browser extension is available
  const hasBrowserExtension = isBrowserExtensionAvailable();
  const {
    data: tabs,
    isLoading: isLoadingTabs,
    mutate,
  } = usePromise(async () => {
    if (!hasBrowserExtension) {
      return [];
    }
    return getBrowserTabs();
  });
  const deletedTabIdsRef = useRef(new Set<number>());

  // Fetch history - will show recent history when no search text for debugging
  const { data: history, isLoading: isLoadingHistory, permissionView } = useHistorySearch(searchText, 25);

  // Fetch suggestions
  const { data: suggestions, isLoading: isLoadingSuggestions } = useSuggestions(searchText);

  // Show permission view if needed
  if (permissionView) {
    return permissionView;
  }

  // Filter out deleted tabs first (tabs that are being closed but might still appear in fetched data)
  const tabsWithoutDeleted = tabs ? tabs.filter((t) => !deletedTabIdsRef.current.has(t.id)) : [];

  // Then filter by search text
  const filteredTabs = tabsWithoutDeleted ? filterSearchable(tabsWithoutDeleted, searchText) : [];

  // Separate URL suggestions from search suggestions
  const urlSuggestions = suggestions.filter((s) => s.type === "url");
  const searchSuggestions = suggestions.filter((s) => s.type === "search");

  const isLoading = isLoadingTabs || isLoadingHistory || isLoadingSuggestions;
  const hasResults = filteredTabs.length > 0 || history.length > 0 || suggestions.length > 0;

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search tabs, history, or the web..."
      throttle
    >
      {!hasResults && !isLoading && searchText.trim().length > 0 && (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Nothing found ¯\\_(ツ)_/¯" />
      )}

      {searchText.trim().length === 0 && !isLoading && !hasResults && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Start typing to search"
          description="Search through your open tabs, browsing history, or the web"
        />
      )}

      {/* URL Suggestions Section - Show first when URL detected */}
      {urlSuggestions.length > 0 && (
        <List.Section title="Open URL">
          {urlSuggestions.map((suggestion) => (
            <SuggestionListItem key={suggestion.id} suggestion={suggestion} />
          ))}
        </List.Section>
      )}

      {/* Open Tabs Section */}
      {hasBrowserExtension && filteredTabs.length > 0 && (
        <List.Section title="Open Tabs" subtitle={`${filteredTabs.length} tab${filteredTabs.length !== 1 ? "s" : ""}`}>
          {filteredTabs.map((tab) => (
            <TabListItem key={tab.id} tab={tab} mutate={mutate} deletedTabIdsRef={deletedTabIdsRef} />
          ))}
        </List.Section>
      )}

      {/* History Section */}
      {history.length > 0 && (
        <List.Section title="History" subtitle={`${history.length} entr${history.length !== 1 ? "ies" : "y"}`}>
          {history.map((entry) => (
            <HistoryListItem key={entry.id} entry={entry} />
          ))}
        </List.Section>
      )}

      {/* Search Suggestions Section */}
      {searchSuggestions.length > 0 && (
        <List.Section
          title="Search Suggestions"
          subtitle={`${searchSuggestions.length} suggestion${searchSuggestions.length !== 1 ? "s" : ""}`}
        >
          {searchSuggestions.map((suggestion) => (
            <SuggestionListItem key={suggestion.id} suggestion={suggestion} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

/**
 * List item for an open tab
 */
function TabListItem({
  tab,
  mutate,
  deletedTabIdsRef,
}: {
  tab: Tab;
  mutate: import("@raycast/utils").MutatePromise<Tab[], undefined>;
  deletedTabIdsRef: React.MutableRefObject<Set<number>>;
}) {
  const domain = extractDomain(tab.url);

  return (
    <List.Item
      title={tab.title || "Untitled"}
      subtitle={domain}
      keywords={[tab.url, tab.title || ""]}
      icon={getFavicon(tab.url)}
      accessories={[{ text: "Tab", tooltip: tab.url }]}
      actions={
        <ActionPanel>
          <SwitchToTabAction tab={tab} />
          <OpenNewTabAction />
          <CloseTabAction tab={tab} mutate={mutate} deletedTabIdsRef={deletedTabIdsRef} />
          <OpenInNewTabAction tab={tab} />
          <CopyUrlAction tab={tab} />
          <CopyAsMarkdownAction tab={tab} />
          <CreateQuicklinkAction url={tab.url} name={tab.title || "Untitled"} />
        </ActionPanel>
      }
    />
  );
}

/**
 * List item for a history entry
 */
function HistoryListItem({ entry }: { entry: HistoryEntry }) {
  const domain = extractDomain(entry.url);

  return (
    <List.Item
      title={entry.title}
      subtitle={domain}
      keywords={[entry.url, entry.title]}
      icon={getFavicon(entry.url)}
      accessories={[{ text: new Date(entry.lastVisitedAt).toLocaleDateString() }]}
      actions={
        <ActionPanel>
          <Action.Open title="Open in Helium" target={normalizeURL(entry.url)} application="net.imput.helium" />
          <Action.CopyToClipboard title="Copy URL" content={entry.url} shortcut={{ modifiers: ["cmd"], key: "c" }} />
          <Action.CopyToClipboard
            title="Copy as Markdown"
            content={`[${entry.title}](${entry.url})`}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <CreateQuicklinkAction url={entry.url} name={entry.title} />
        </ActionPanel>
      }
    />
  );
}

/**
 * List item for a search suggestion
 */
function SuggestionListItem({ suggestion }: { suggestion: Suggestion }) {
  const searchEngineName = getSearchEngineName();
  const isUrlType = suggestion.type === "url";

  const title = isUrlType ? `Open ${suggestion.query}` : suggestion.query;
  const subtitle = isUrlType ? "Open URL" : `Search with ${searchEngineName}`;

  return (
    <List.Item
      title={title}
      subtitle={subtitle}
      icon={isUrlType ? Icon.Link : Icon.MagnifyingGlass}
      actions={
        <ActionPanel>
          <Action.Open
            title={isUrlType ? "Open URL" : "Search"}
            target={suggestion.url}
            application="net.imput.helium"
          />
          <Action.CopyToClipboard
            title="Copy URL"
            content={suggestion.url}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Query"
            content={suggestion.query}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <CreateQuicklinkAction url={suggestion.url} name={suggestion.query} />
        </ActionPanel>
      }
    />
  );
}
