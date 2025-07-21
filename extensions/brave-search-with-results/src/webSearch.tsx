import { List, ActionPanel, Action, Icon, LaunchProps } from "@raycast/api";
import { useState, useMemo, useCallback } from "react";

import useWebSearch from "./hooks/useWebSearch.js";
import useHistory, { Type } from "./hooks/useHistory.js";

import groupHistory from "./utils/groupHistory.js";
import formatUrl from "./utils/formatUrl.js";
import useSuggestions from "./hooks/useSuggestions.js";
import useMode from "./hooks/useMode.js";

enum Mode {
  History,
  Suggestions,
  Search,
}

export default function WebSearchCommand(props: LaunchProps) {
  const [fallbackText, setFallbackText] = useState(props.fallbackText);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const mode = useMode(searching, query);

  const {
    isLoading: isLoadingHistory,
    items: historyItems,
    addToHistory,
    removeFromHistory,
    clearHistory,
  } = useHistory(Type.Web);
  const { isLoading: isLoadingSuggestions, results: suggestionsResults } = useSuggestions(
    query,
    mode === Mode.Suggestions,
  );
  const { isLoading: isLoadingWebSearch, results: webSearchResults } = useWebSearch(query, mode === Mode.Search);

  const historyGroups = useMemo(() => groupHistory(historyItems), [historyItems]);
  const isLoading = isLoadingHistory || isLoadingSuggestions || isLoadingWebSearch;

  const onSearchTextChange = useCallback(
    (query: string) => {
      // When called as a fallback, Raycast calls this function with the fallback text, which should…
      // …add the query to the history.
      // …invoke the search .
      const fallbackTextSearchTextChange = fallbackText === query;

      setQuery(query);

      if (fallbackTextSearchTextChange) {
        setSearching(true);
        addToHistory(query);
      } else {
        setSearching(false);
      }

      // Avoid that upcoming function calls are treated as fallback calls
      setFallbackText(undefined);
    },
    [fallbackText, addToHistory, setSearching, setQuery, setFallbackText],
  );

  const historyList = historyGroups.map((historyGroup) => (
    <List.Section key={historyGroup.title} title={historyGroup.title}>
      {historyGroup.items.map((item) => (
        <List.Item
          key={item.id}
          icon={Icon.MagnifyingGlass}
          title={item.query}
          subtitle={`Search web for '${item.query}'`}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action
                  icon={Icon.MagnifyingGlass}
                  title="Search"
                  onAction={() => {
                    addToHistory(item.query);
                    setQuery(item.query);
                    setSearching(true);
                  }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  icon={Icon.Trash}
                  title="Delete Entry"
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => {
                    removeFromHistory(item.id);
                  }}
                />
                <Action
                  icon={Icon.Trash}
                  title="Delete All Entries"
                  shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                  onAction={clearHistory}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  ));

  const suggestionsList = (
    <List.Section title="Suggestions">
      {suggestionsResults.map((suggestionsResult) => (
        <List.Item
          key={suggestionsResult.id}
          icon={Icon.MagnifyingGlass}
          title={suggestionsResult.query}
          subtitle={`Search web for '${suggestionsResult.query}'`}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.MagnifyingGlass}
                title="Search"
                onAction={() => {
                  addToHistory(suggestionsResult.query);
                  setQuery(suggestionsResult.query);
                  setSearching(true);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );

  const webSearchList = (
    <List.Section title="Results">
      {webSearchResults.map((searchResult) => (
        <List.Item
          key={searchResult.id}
          icon={searchResult.icon}
          title={searchResult.title}
          subtitle={formatUrl(searchResult.url)}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.OpenInBrowser url={searchResult.url.toString()} />
                <Action.OpenWith path={searchResult.url.toString()} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  title="Copy URL"
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                  content={searchResult.url.toString()}
                />
                <Action.CopyToClipboard
                  title="Copy Title"
                  shortcut={{ modifiers: ["shift", "cmd"], key: "." }}
                  content={searchResult.title}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );

  return (
    <List searchText={query} onSearchTextChange={onSearchTextChange} isLoading={isLoading} filtering={false}>
      {mode === Mode.History && historyList}
      {mode === Mode.Suggestions && suggestionsList}
      {mode === Mode.Search && webSearchList}
    </List>
  );
}
