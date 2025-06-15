import { LaunchProps, List, Clipboard, getSelectedText, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

import SearchResultItem from "./components/SearchResultItem";
import useSearch from "./hooks/useSearch";
import { useSearchHistory } from "./hooks/useSearchHistory";

export default function Command(props: LaunchProps) {
  const { launchContext } = props;
  const { searchText: initialSearchText = "" } = (launchContext as { searchText: string }) || {};
  const [initialText, setInitialText] = useState(initialSearchText);
  const [error, setError] = useState<string | null>(null);
  const { state, setSearchText: search, searchText } = useSearch(initialText);

  useEffect(() => {
    async function getInitialSearchText() {
      try {
        // If we already have initial text from launch context, use it
        if (initialSearchText) {
          return;
        }

        // First try to get selected text
        const selectedText = await getSelectedText();
        if (selectedText && selectedText.trim()) {
          setInitialText(selectedText.trim());
          search(selectedText.trim());
          return;
        }

        // Fallback to clipboard content
        const clipboardText = await Clipboard.readText();
        if (clipboardText && clipboardText.trim()) {
          setInitialText(clipboardText.trim());
          search(clipboardText.trim());
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        setError(errorMessage);
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: errorMessage,
        });
      }
    }

    getInitialSearchText();
  }, []);

  const { addToHistory, removeFromHistory } = useSearchHistory(searchText);

  const handleSearchChange = async (newSearchText: string) => {
    try {
      await search(newSearchText);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Search failed";
      setError(errorMessage);
      await showToast({
        style: Toast.Style.Failure,
        title: "Search Error",
        message: errorMessage,
      });
    }
  };

  return (
    <List
      isLoading={state.isLoading}
      searchText={searchText}
      onSearchTextChange={handleSearchChange}
      searchBarPlaceholder="Search..."
      throttle
    >
      {error ? (
        <List.EmptyView
          title="Error"
          description={error}
          icon={{ source: "🚨" }}
        />
      ) : (
        <List.Section title="Results" subtitle={state.results.length + ""}>
          {state.results.map((searchResult) => (
            <SearchResultItem
              key={searchResult.id}
              searchResult={searchResult}
              addToHistory={addToHistory}
              removeFromHistory={removeFromHistory}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
