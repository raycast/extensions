import { useState, useEffect, useCallback } from "react";
import { Action, ActionPanel, List, Icon, LocalStorage, getPreferenceValues, LaunchProps } from "@raycast/api";
import { makeSearchURL } from "./utils/url";
import { Preferences } from "./utils/types";

// Main search command component
function SearchCommand({ initialSearchText }: { initialSearchText?: string }) {
  // Get user preferences
  const { saveSearchHistory } = getPreferenceValues<Preferences>();

  // State management
  const [searchText, setSearchText] = useState(initialSearchText || "");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load recent searches from LocalStorage
  const loadRecentSearches = useCallback(async () => {
    const storedSearches = await LocalStorage.getItem<string>("recent-searches");
    setRecentSearches(storedSearches ? JSON.parse(storedSearches) : []);
    setIsLoading(false);
  }, []);

  // Load recent searches on component mount
  useEffect(() => {
    loadRecentSearches();
  }, [loadRecentSearches]);

  // Save new searches to LocalStorage with debounce
  useEffect(() => {
    if (searchText.length > 3 && !recentSearches.includes(searchText.trim()) && saveSearchHistory) {
      const timeoutId = setTimeout(async () => {
        const updatedSearches = [searchText, ...recentSearches.filter((s) => s !== searchText)].slice(0, 10);
        await LocalStorage.setItem("recent-searches", JSON.stringify(updatedSearches));
        setRecentSearches(updatedSearches);
      }, 3000);

      return () => clearTimeout(timeoutId);
    }
  }, [searchText, recentSearches, saveSearchHistory]);

  // Handle removing a search from history
  const handleRemoveSearch = useCallback(
    async (searchToRemove: string) => {
      const updatedSearches = recentSearches.filter((s) => s !== searchToRemove);
      await LocalStorage.setItem("recent-searches", JSON.stringify(updatedSearches));
      setRecentSearches(updatedSearches);
    },
    [recentSearches]
  );

  // Common props for List component
  const sharedProps: React.ComponentProps<typeof List> = {
    searchBarPlaceholder: "Search Google Maps...",
    searchText,
    onSearchTextChange: setSearchText,
    isLoading,
    throttle: true,
  };

  // Render recent searches when there's no active search
  if (!searchText) {
    return (
      <List {...sharedProps}>
        <List.EmptyView title="Search Google Maps" />
        {recentSearches.map((search, index) => (
          <List.Item
            key={search}
            title={search}
            icon={Icon.Clock}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={makeSearchURL(search)} />
                <Action icon={Icon.MagnifyingGlass} title="Search Again" onAction={() => setSearchText(search)} />
                <Action.CopyToClipboard title="Copy URL" content={makeSearchURL(search)} />
                <Action icon={Icon.Trash} title="Remove Search" onAction={() => handleRemoveSearch(search)} />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }

  // Render active search result
  return (
    <List {...sharedProps}>
      <List.Item
        title={searchText}
        icon={Icon.MagnifyingGlass}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url={makeSearchURL(searchText)} />
            <Action.CopyToClipboard title="Copy URL" content={makeSearchURL(searchText)} />
          </ActionPanel>
        }
      />
    </List>
  );
}

// Entry point for the Raycast command
export default function Command({ launchContext, fallbackText }: LaunchProps<{ launchContext: { query: string } }>) {
  return <SearchCommand initialSearchText={launchContext?.query ?? fallbackText} />;
}
