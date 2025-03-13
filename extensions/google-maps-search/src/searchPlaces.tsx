import { useState, useEffect, useCallback } from "react";
import {
  List,
  Icon,
  openExtensionPreferences,
  LocalStorage,
  getPreferenceValues,
  LaunchProps,
  Clipboard,
  Action,
  ActionPanel,
  showToast,
  Toast,
} from "@raycast/api";
import { PlaceDetailView } from "./components/placeDetailView";
import { usePlaceSearch } from "./hooks/usePlaceSearch";
import { PlaceActions } from "./components/placeActions";
import { PreferencesActions } from "./components/preferencesActions";
import { makeSearchURL, createPlaceURL } from "./utils/url";
import { Preferences } from "./types";
import { showFailureToast } from "@raycast/utils";

export default function Command({ launchContext, fallbackText }: LaunchProps<{ launchContext: { query: string } }>) {
  return <SearchPlacesCommand initialSearchText={launchContext?.query ?? fallbackText} />;
}

function SearchPlacesCommand({ initialSearchText }: { initialSearchText?: string }) {
  const preferences = getPreferenceValues<Preferences>();
  const { saveSearchHistory } = preferences;
  const { searchText, setSearchText, isLoading, places, hasApiKey } = usePlaceSearch(initialSearchText);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from local storage
  const loadRecentSearchesCallback = useCallback(async () => {
    const storedSearches = await LocalStorage.getItem<string>("recent-searches");
    setRecentSearches(storedSearches ? JSON.parse(storedSearches) : []);
  }, []);

  useEffect(() => {
    loadRecentSearchesCallback();
  }, [loadRecentSearchesCallback]);

  // Save search to recent searches
  useEffect(() => {
    if (searchText.length > 3 && !recentSearches.includes(searchText.trim()) && saveSearchHistory) {
      const timeoutId = setTimeout(async () => {
        const updatedSearches = [searchText, ...recentSearches.filter((s) => s !== searchText)].slice(0, 10);
        await LocalStorage.setItem("recent-searches", JSON.stringify(updatedSearches));
        setRecentSearches(updatedSearches);
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [searchText, recentSearches, saveSearchHistory]);

  // Handle removing a search from history
  const handleRemoveSearchCallback = useCallback(
    async (searchToRemove: string) => {
      const updatedSearches = recentSearches.filter((s) => s !== searchToRemove);
      await LocalStorage.setItem("recent-searches", JSON.stringify(updatedSearches));
      setRecentSearches(updatedSearches);
    },
    [recentSearches]
  );

  // Handle clearing all recent searches
  const handleClearAllSearchesCallback = useCallback(async () => {
    await LocalStorage.removeItem("recent-searches");
    setRecentSearches([]);
  }, []);

  // Handle copying coordinates URL
  const handleCopyCoordinatesCallback = useCallback(async (query: string) => {
    try {
      // Create a URL that makes it easy to get coordinates
      const placeURL = createPlaceURL(query);

      // Copy the URL to clipboard
      await Clipboard.copy(placeURL);

      // Show success toast with clear instructions
      await showToast({
        style: Toast.Style.Success,
        title: "Location URL copied",
        message: "Open URL, right-click on pin, select 'Copy coordinates'",
      });
    } catch (error) {
      // Show error toast
      showFailureToast(error, { title: "Failed to copy URL", message: String(error) });
    }
  }, []);

  // Format place types for display
  const formatPlaceTypesCallback = (types: string[]): string => {
    return types
      .slice(0, 3)
      .map((type) => type.replace(/_/g, " "))
      .join(", ");
  };

  // If a place is selected, show its details
  if (selectedPlaceId) {
    return <PlaceDetailView placeId={selectedPlaceId} onBack={() => setSelectedPlaceId(null)} />;
  }

  // Otherwise, show the search interface
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search for places..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
    >
      {!hasApiKey ? (
        <List.EmptyView
          title="API Key Missing"
          description="Please set your Google Places API key in preferences"
          icon={Icon.Key}
          actions={<PreferencesActions onOpenPreferences={openExtensionPreferences} />}
        />
      ) : searchText.length < 3 ? (
        <>
          <List.EmptyView
            title="Enter at least 3 characters"
            description="Search for places by name, address, or type"
            icon="no-view.png"
          />
          {recentSearches.length > 0 && (
            <List.Section title="Recent Searches">
              {recentSearches.map((search) => (
                <List.Item
                  key={search}
                  title={search}
                  icon={Icon.Clock}
                  actions={
                    <ActionPanel>
                      <Action title="Search" onAction={() => setSearchText(search)} />
                      <Action.OpenInBrowser url={makeSearchURL(search)} title="Open in Google Maps" />
                      <Action
                        icon={Icon.Trash}
                        title="Remove Search"
                        onAction={() => handleRemoveSearchCallback(search)}
                        shortcut={{ modifiers: ["cmd"], key: "d" }}
                      />
                      <Action
                        icon={Icon.Trash}
                        title="Clear All Searches"
                        shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                        onAction={handleClearAllSearchesCallback}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
        </>
      ) : places.length === 0 && !isLoading ? (
        <List.EmptyView title="No places found" description="Try a different search term" icon={Icon.XMarkCircle} />
      ) : (
        <>
          {/* Show Google Maps search option */}
          <List.Section title="Open in Google Maps">
            <List.Item
              title={`Search "${searchText}" in Google Maps`}
              icon={Icon.Globe}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={makeSearchURL(searchText)} />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={makeSearchURL(searchText)}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action
                    icon={Icon.Pin}
                    title="Copy Coordinates URL"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    onAction={() => handleCopyCoordinatesCallback(searchText)}
                  />
                </ActionPanel>
              }
            />
          </List.Section>

          {/* Show Places API results */}
          <List.Section title="Places">
            {places.map((place) => (
              <List.Item
                key={place.placeId}
                title={place.name}
                subtitle={place.address}
                accessories={[
                  { text: place.rating ? `★ ${place.rating}` : undefined },
                  { text: formatPlaceTypesCallback(place.types) },
                  { icon: place.openNow ? { source: Icon.Checkmark, tintColor: "#30d158" } : undefined },
                ]}
                actions={<PlaceActions place={place} onViewDetails={setSelectedPlaceId} />}
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

// Renamed to search-places.tsx
