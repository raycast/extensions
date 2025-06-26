import { LaunchProps, List, getSelectedText, showToast, Toast } from "@raycast/api";
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

  // Add cleanup effect to clear search on exit
  useEffect(() => {
    return () => {
      search("");
      setInitialText("");
    };
  }, []);

  useEffect(() => {
    async function getInitialSearchText() {
      try {
        // If we already have initial text from launch context, use it
        if (initialSearchText) {
          return;
        }

        // Try to get selected text
        try {
          const selectedText = await getSelectedText();
          if (selectedText?.trim()) {
            setInitialText(selectedText.trim());
            search(selectedText.trim());
            return;
          }
        } catch (error) {
          console.error("Failed to get selected text:", error);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to initialize search";
        setError(errorMessage);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to initialize search",
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
      searchBarPlaceholder="Search Japanese words, kanji, or English..."
      throttle
    >
      {error ? (
        <List.EmptyView
          title="Error"
          description={error}
          icon={{ source: "🚨" }}
        />
      ) : state.results.length === 0 ? (
        <List.EmptyView
          title="No results"
          description="Try searching for something else"
          icon={{ source: "🔍" }}
        />
      ) : (
        state.results.map((result) => (
          <SearchResultItem
            key={result.id}
            searchResult={result}
            addToHistory={addToHistory}
            removeFromHistory={removeFromHistory}
          />
        ))
      )}
    </List>
  );
}