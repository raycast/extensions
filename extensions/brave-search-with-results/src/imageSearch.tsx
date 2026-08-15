import { List, Grid, ActionPanel, Action, Icon, LaunchProps, Keyboard } from "@raycast/api";
import { useState, useMemo, useCallback } from "react";

import useImageSearch from "./hooks/useImageSearch.js";
import useHistory, { Type } from "./hooks/useHistory.js";
import useMode, { Mode } from "./hooks/useMode.js";
import useSuggestions from "./hooks/useSuggestions.js";

import groupHistory from "./utils/groupHistory.js";
import formatUrl from "./utils/formatUrl.js";
import HistoryListItem from "./components/HistoryListItem.js";

export default function ImageSearchCommand(props: LaunchProps) {
  const [fallbackText, setFallbackText] = useState(props.fallbackText);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useMode();

  const { isLoadingHistory, historyItems, addHistoryItem, removeHistoryItem, clearHistory } = useHistory(Type.Image);
  const { isLoadingSuggestions, suggestionsResults } = useSuggestions(query, mode === Mode.Suggestions);
  const { isLoadingImageSearch, imageSearchResults } = useImageSearch(query, mode === Mode.Search);

  const historyGroups = useMemo(() => groupHistory(historyItems), [historyItems]);
  const isLoading = isLoadingHistory || isLoadingSuggestions || isLoadingImageSearch;

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
          icon={Icon.Image}
          title={suggestionsResult.query}
          subtitle={`Search images for '${suggestionsResult.query}'`}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Image}
                title="Search Images"
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

  const imageSearchGrid = (
    <Grid.Section title="Images">
      {imageSearchResults.map((searchResult) => (
        <Grid.Item
          key={searchResult.id}
          content={searchResult.icon}
          title={searchResult.title}
          subtitle={formatUrl(searchResult.sourceUrl)}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.OpenInBrowser url={searchResult.sourceUrl.toString()} title="View Image" />
                <Action.OpenInBrowser url={searchResult.url.toString()} title="View Website" />
                <Action.OpenWith shortcut={Keyboard.Shortcut.Common.OpenWith} path={searchResult.url.toString()} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  title="Copy Image URL"
                  shortcut={Keyboard.Shortcut.Common.Copy}
                  content={searchResult.sourceUrl.toString()}
                />
                <Action.CopyToClipboard title="Copy Website URL" content={searchResult.url.toString()} />
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
    </Grid.Section>
  );

  const list = (
    <List searchText={query} onSearchTextChange={onSearchTextChange} isLoading={isLoading} filtering={false}>
      {mode === Mode.History && historyList}
      {mode === Mode.Suggestions && suggestionsList}
    </List>
  );

  const grid = (
    <Grid searchText={query} onSearchTextChange={onSearchTextChange} isLoading={isLoading} filtering={false}>
      {mode === Mode.Search && imageSearchGrid}
    </Grid>
  );

  return (
    <>
      {mode === Mode.History && list}
      {mode === Mode.Suggestions && list}
      {mode === Mode.Search && grid}
    </>
  );
}
