import { showFailureToast, useLocalStorage } from "@raycast/utils";
import { useState, useCallback, useMemo } from "react";
import {
  List,
  Icon,
  openExtensionPreferences,
  getPreferenceValues,
  LaunchProps,
  Clipboard,
  Action,
  ActionPanel,
  showToast,
  Toast,
} from "@raycast/api";
import { PlaceDetailView } from "./components/placeDetailView";
import { PlaceActions } from "./components/placeActions";
import { PreferencesActions } from "./components/preferencesActions";
import { makeSearchURL, createPlaceURL } from "./utils/url";
import { Preferences } from "./types";
import { usePlaceSearch } from "./hooks/usePlaceSearch";
import { debounce } from "./helpers/debounce";

// Constants
const MIN_SEARCH_LENGTH = 3; // Minimum characters required for a valid search
const DEBOUNCE_DELAY_MS = 500; // Delay for debounced operations

export default function Command({ launchContext, fallbackText }: LaunchProps<{ launchContext: { query: string } }>) {
  return <SearchPlacesCommand initialSearchText={launchContext?.query ?? fallbackText} />;
}

function SearchPlacesCommand({ initialSearchText }: { initialSearchText?: string }) {
  const preferences = getPreferenceValues<Preferences>();
  const { saveSearchHistory } = preferences;
  const { searchText, setSearchText, isLoading, places, hasApiKey } = usePlaceSearch(initialSearchText);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  // Use useLocalStorage hook for recent searches
  const { value: recentSearches = [], setValue: setRecentSearches } = useLocalStorage<string[]>("recent-searches", []);

  // Save search to recent searches
  const saveSearch = useCallback(
    (search: string) => {
      // Trim the search text first for consistent comparison
      const trimmedSearch = search.trim();

      if (trimmedSearch.length >= MIN_SEARCH_LENGTH && !recentSearches.includes(trimmedSearch) && saveSearchHistory) {
        // Use the trimmed search for storage to maintain consistency
        const updatedSearches = [trimmedSearch, ...recentSearches.filter((s) => s !== trimmedSearch)].slice(0, 10);
        setRecentSearches(updatedSearches);
      }
    },
    [recentSearches, saveSearchHistory, setRecentSearches]
  );

  // Create a debounced save search function using our custom debounce helper
  const debouncedSaveSearch = useMemo(
    () => debounce((text: string) => saveSearch(text), DEBOUNCE_DELAY_MS),
    [saveSearch]
  );

  // Handle search text change with debounce
  const handleSearchTextChange = useCallback(
    (text: string) => {
      setSearchText(text);

      // Only attempt to save if it meets our criteria
      // Trim the search text first for consistent comparison
      const trimmedText = text.trim();
      if (trimmedText.length >= MIN_SEARCH_LENGTH && !recentSearches.includes(trimmedText) && saveSearchHistory) {
        // Use our debounced save function with the original text
        // (the saveSearch function will handle trimming consistently)
        debouncedSaveSearch(text);
      }
    },
    [setSearchText, recentSearches, saveSearchHistory, debouncedSaveSearch]
  );

  // Handle removing a search from history
  const handleRemoveSearchCallback = useCallback(
    (searchToRemove: string) => {
      const updatedSearches = recentSearches.filter((s) => s !== searchToRemove);
      setRecentSearches(updatedSearches);
    },
    [recentSearches, setRecentSearches]
  );

  // Handle clearing all recent searches
  const handleClearAllSearchesCallback = useCallback(() => {
    setRecentSearches([]);
  }, [setRecentSearches]);

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
  const formatPlaceTypesCallback = useCallback((types: string[]): string => {
    return types
      .slice(0, 3)
      .map((type) => type.replace(/_/g, " "))
      .join(", ");
  }, []);

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
      onSearchTextChange={handleSearchTextChange}
      throttle
    >
      {!hasApiKey ? (
        <List.EmptyView
          title="API Key Missing"
          description="Please set your Google Places API key in preferences"
          icon={Icon.Key}
          actions={<PreferencesActions onOpenPreferences={openExtensionPreferences} />}
        />
      ) : searchText.length < MIN_SEARCH_LENGTH ? (
        <>
          <List.EmptyView
            title={`Enter at least ${MIN_SEARCH_LENGTH} characters`}
            description="Search for places by name, address, or type"
            icon={{ source: "no-view.png" }}
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
                        title="Delete Search"
                        onAction={() => handleRemoveSearchCallback(search)}
                        shortcut={{ modifiers: ["ctrl"], key: "x" }}
                        style={Action.Style.Destructive}
                      />
                      <Action
                        icon={Icon.Trash}
                        title="Delete All Searches"
                        shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                        onAction={handleClearAllSearchesCallback}
                        style={Action.Style.Destructive}
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
