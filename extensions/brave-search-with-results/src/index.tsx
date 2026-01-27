import { Keyboard, List, ActionPanel, Action, Icon, LaunchProps } from "@raycast/api";
import { useState, useMemo, useCallback } from "react";

import useWebSearch from "./hooks/useWebSearch.js";
import useHistory, { Type } from "./hooks/useHistory.js";

import groupHistory from "./utils/groupHistory.js";
import formatUrl from "./utils/formatUrl.js";
import useSuggestions from "./hooks/useSuggestions.js";
import useMode from "./hooks/useMode.js";
import HistoryListItem from "./components/HistoryListItem.js";

enum Mode {
  History,
  Suggestions,
  Search,
}

export default function Index(props: LaunchProps) {
  const [fallbackText, setFallbackText] = useState(props.fallbackText);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useMode();

  const { isLoadingHistory, historyItems, addHistoryItem, removeHistoryItem, clearHistory } = useHistory(Type.Web);
  const { isLoadingSuggestions, suggestionsResults } = useSuggestions(query, mode === Mode.Suggestions);
  const { isLoadingWebSearch, webSearchResults } = useWebSearch(query, mode === Mode.Search);

  const historyGroups = useMemo(() => groupHistory(historyItems), [historyItems]);
  const isLoading = isLoadingHistory || isLoadingSuggestions || isLoadingWebSearch;

  const onSearchTextChange = useCallback(
    (query: string) => {
      // When called as a fallback, Raycast calls this function with the fallback text, which should invoke the search.
      // The fallback text is not added to the history as it's already part of the Raycast history.
      const fallbackTextSearchTextChange = fallbackText === query;

      setQuery(query);

      if (fallbackTextSearchTextChange) {
        setMode(Mode.Search);
      } else {
        if (query.length > 0) {
          setMode(Mode.Suggestions);
        } else {
          setMode(Mode.History);
        }
      }

      // Avoid that upcoming function calls are treated as fallback calls
      setFallbackText(undefined);
    },
    [fallbackText, setMode, setQuery, setFallbackText],
  );

  const historyList = historyGroups.map((historyGroup) => (
    <List.Section key={historyGroup.title} title={historyGroup.title}>
      {historyGroup.items.map((item) => (
        <HistoryListItem
          key={item.id}
          item={item}
          addHistoryItem={addHistoryItem}
          removeHistoryItem={removeHistoryItem}
          clearHistory={clearHistory}
          setQuery={setQuery}
          setMode={setMode}
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
                  addHistoryItem(suggestionsResult.query);
                  setQuery(suggestionsResult.query);
                  setMode(Mode.Search);
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
                <Action.OpenWith shortcut={Keyboard.Shortcut.Common.OpenWith} path={searchResult.url.toString()} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  title="Copy URL"
                  shortcut={Keyboard.Shortcut.Common.Copy}
                  content={searchResult.url.toString()}
                />
                <Action.CopyToClipboard
                  title="Copy Title"
                  shortcut={Keyboard.Shortcut.Common.CopyName}
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
