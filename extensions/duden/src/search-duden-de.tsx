/**
 * Main search command for Duden.de word lookup
 */

import { useState, useEffect } from "react";
import { List, ActionPanel, Action, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { searchAndGetDetails, getWordDetails } from "./api/duden";
import { SearchResult } from "./types/duden";
import WordDetails from "./components/WordDetails";

export default function SearchDuden() {
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { push } = useNavigation();

  // Handle search with minimum character requirement
  useEffect(() => {
    if (searchText.length < 3) {
      setSearchResults([]);
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);

    const performSearch = async () => {
      try {
        const { results, singleWord } = await searchAndGetDetails(searchText);

        if (!isCancelled) {
          setSearchResults(results);

          // If single result, push details immediately as discussed
          if (singleWord) {
            push(<WordDetails word={singleWord} />);
          }
        }
      } catch (error) {
        if (!isCancelled) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Search failed",
            message: error instanceof Error ? error.message : "Unknown error",
          });
          setSearchResults([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    performSearch();

    return () => {
      isCancelled = true;
    };
  }, [searchText]);

  // Handle word selection from search results
  const handleWordSelection = async (result: SearchResult) => {
    setIsLoading(true);
    try {
      const word = await getWordDetails(result.urlname);
      push(<WordDetails word={word} />);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load word details",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search German words on Duden.de (minimum 3 characters)..."
      throttle
    >
      {searchText.length < 3 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Start typing to search"
          description="Enter at least 3 characters to search for German words"
        />
      ) : searchResults.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="No results found"
          description={`No words found for "${searchText}"`}
        />
      ) : (
        searchResults.map((result, index) => (
          <List.Item
            key={`${result.urlname}-${index}`}
            title={result.name}
            subtitle={result.partOfSpeech}
            icon={Icon.Document}
            actions={
              <ActionPanel>
                <Action title="View Details" icon={Icon.Eye} onAction={() => handleWordSelection(result)} />
                <Action.CopyToClipboard
                  title="Copy Word"
                  content={result.name}
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.OpenInBrowser
                  title="Open in Duden.de"
                  url={`https://www.duden.de/rechtschreibung/${result.urlname}`}
                  icon={Icon.Globe}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
