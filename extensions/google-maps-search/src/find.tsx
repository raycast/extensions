import { useState, useEffect, useCallback } from "react";
import { Action, ActionPanel, List, Icon, LocalStorage, getPreferenceValues, LaunchProps } from "@raycast/api";
import { makeSearchURL } from "./utils/url";
import { Preferences } from "./utils/types";

function SearchCommand({ initialSearchText }: { initialSearchText?: string }) {
  const { saveSearchHistory } = getPreferenceValues<Preferences>();

  const [searchText, setSearchText] = useState(initialSearchText || "");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadRecentSearches = useCallback(async () => {
    const storedSearches = await LocalStorage.getItem<string>("recent-searches");
    setRecentSearches(storedSearches ? JSON.parse(storedSearches) : []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadRecentSearches();
  }, [loadRecentSearches]);

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

  const handleRemoveSearch = useCallback(
    async (searchToRemove: string) => {
      const updatedSearches = recentSearches.filter((s) => s !== searchToRemove);
      await LocalStorage.setItem("recent-searches", JSON.stringify(updatedSearches));
      setRecentSearches(updatedSearches);
    },
    [recentSearches]
  );

  // New function to clear all recent searches
  const handleClearAllSearches = useCallback(async () => {
    await LocalStorage.removeItem("recent-searches");
    setRecentSearches([]);
  }, []);

  const sharedProps: React.ComponentProps<typeof List> = {
    searchBarPlaceholder: "Search Google Maps...",
    searchText,
    onSearchTextChange: setSearchText,
    isLoading,
  };

  if (!searchText) {
    return (
      <List {...sharedProps}>
        <List.EmptyView title="Search Google Maps" />
        {recentSearches.map((search) => (
          <List.Item
            key={search}
            title={search}
            icon={Icon.Clock}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={makeSearchURL(search)} />
                <Action icon={Icon.MagnifyingGlass} title="Search Again" onAction={() => setSearchText(search)} />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={makeSearchURL(search)}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action icon={Icon.Trash} title="Remove Search" onAction={() => handleRemoveSearch(search)} />
                {/* New action to clear all searches */}
                <Action
                  icon={Icon.Trash}
                  title="Clear All Searches"
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={handleClearAllSearches}
                />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }

  return (
    <List {...sharedProps}>
      <List.Item
        title={searchText}
        icon={Icon.MagnifyingGlass}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url={makeSearchURL(searchText)} />
            <Action.CopyToClipboard
              title="Copy URL"
              content={makeSearchURL(searchText)}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

export default function Command({ launchContext, fallbackText }: LaunchProps<{ launchContext: { query: string } }>) {
  return <SearchCommand initialSearchText={launchContext?.query ?? fallbackText} />;
}
