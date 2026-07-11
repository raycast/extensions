// src/find-departures.tsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { ActionPanel, Action, List, Icon, showToast, Toast, Color } from "@raycast/api";
import { useFavorites } from "./hooks/useFavorites";
import { fetchStations } from "./utils/api";
import { FilterableSystem, Station, StationListItemProps } from "./types";
import StationDepartures from "./components/StationDepartures";
import ViewAlertsCommand from "./view-alerts";
import { LocalStorage, getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();
const showAccessibilityStatus = preferences.showAccessibilityStatus;

// Define the possible values for our system filter dropdown
const systemFilters = ["All", "SUBWAY", "LIRR", "MNR"] as const;

// Display names for the UI
const systemFilterDisplayNames = {
  All: "All",
  SUBWAY: "MTA Subway",
  LIRR: "Long Island Rail Road",
  MNR: "Metro-North Railroad",
} as const;

type SystemFilterValue = (typeof systemFilters)[number]; // Type: "ALL" | "SUBWAY" | "LIRR" | "MNR"

// ---- STATIONS CACHE
const ALL_STATIONS_CACHE_KEY = "allStationsList";
const ALL_STATIONS_TIMESTAMP_KEY = "allStationsListTimestamp";
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

async function getCachedAllStations(): Promise<Station[]> {
  try {
    const cached = await LocalStorage.getItem(ALL_STATIONS_CACHE_KEY);
    const cachedTimestamp = await LocalStorage.getItem(ALL_STATIONS_TIMESTAMP_KEY);
    const now = Date.now();

    if (cached && cachedTimestamp && now - parseInt(String(cachedTimestamp), 10) < CACHE_DURATION_MS) {
      // Using cached station list
      return JSON.parse(String(cached)) as Station[];
    }

    // Cache miss or expired, fetching new data
    // *** Fetch ALL stations - no system filter ***
    const stations = await fetchStations(); // Pass no arguments for system filter

    // Cache the full list
    await LocalStorage.setItem(ALL_STATIONS_CACHE_KEY, JSON.stringify(stations));
    await LocalStorage.setItem(ALL_STATIONS_TIMESTAMP_KEY, now.toString());
    return stations;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    showToast({
      style: Toast.Style.Failure,
      title: "Error Loading Stations",
      message: `Cache interaction failed. Fetching from API. Error: ${errorMessage}`,
    });
    console.error("Error accessing cached stations, fetching directly from API:", error);
    // Fallback fetch
    return fetchStations();
  }
}

export default function FindDeparturesCommand() {
  const [searchText, setSearchText] = useState("");
  const [selectedSystem, setSelectedSystem] = useState<SystemFilterValue>("All");
  const [allStations, setAllStations] = useState<Station[]>([]); // FULL list from cache/API
  const [isLoading, setIsLoading] = useState(true);
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();

  // --- Load ALL stations (once on mount or refresh) ---
  const loadStations = useCallback(
    async (toastInstance?: Toast) => {
      // If not refreshing manually, don't manage toast here
      if (!toastInstance) {
        setIsLoading(true);
      }
      let success = false;
      try {
        const stations = await getCachedAllStations(); // Fetches/caches the full list
        // Sort once
        stations.sort((a, b) => a.name.localeCompare(b.name));
        setAllStations(stations); // Update with new/cached data
        success = true; // Mark as successful
      } catch (err: unknown) {
        console.error("Failed to fetch stations data:", err);
        const message = err instanceof Error ? err.message : "Could not load station data.";
        // Update toast ONLY if it was passed (meaning it was a manual refresh)
        if (toastInstance) {
          toastInstance.style = Toast.Style.Failure;
          toastInstance.title = "Refresh Failed";
          toastInstance.message = message;
        } else {
          showToast({ style: Toast.Style.Failure, title: "Error Loading Stations", message: message });
        }
        setAllStations([]); // Clear stations ONLY if fetch fails
      } finally {
        setIsLoading(false);
        if (success && toastInstance) {
          toastInstance.style = Toast.Style.Success;
          toastInstance.title = "Stations Refreshed";
          toastInstance.message = `Loaded ${allStations.length} stations.`;
        }
      }
    },
    [allStations.length],
  );

  // --- Effect to load stations ONCE on initial mount
  useEffect(() => {
    loadStations();
  }, [loadStations]); // Depends only on the stable loadStations function

  // --- Memo hook to SPLIT the FULL list (used only when unfiltered)
  const { favoriteStations, otherStations } = useMemo(() => {
    const favorites: Station[] = [];
    const others: Station[] = [];
    // Use the complete list from state
    allStations.forEach((station) => {
      if (isFavorite(station.id)) {
        favorites.push(station);
      } else {
        others.push(station);
      }
    });
    // Sorting within sections is good
    favorites.sort((a, b) => a.name.localeCompare(b.name));
    others.sort((a, b) => a.name.localeCompare(b.name));
    return { favoriteStations: favorites, otherStations: others };
  }, [allStations, isFavorite]); // Depends on the full list and favorite status

  // -- Memo hook for COMBINED filtering (used only when filtered)
  const filteredStations = useMemo(() => {
    let stationsToFilter = allStations;

    // 1. Filter by selected system
    if (selectedSystem !== "All") {
      stationsToFilter = stationsToFilter.filter((station) => station.system === selectedSystem);
    }

    // 2. Filter by search text
    if (searchText) {
      const lowerSearchText = searchText.toLowerCase();
      stationsToFilter = stationsToFilter.filter(
        (station) =>
          station.name.toLowerCase().includes(lowerSearchText) ||
          (station.system && station.system.toLowerCase().includes(lowerSearchText)),
      );
    }
    // Sort the combined filtered results (optional but good UX)
    stationsToFilter.sort((a, b) => a.name.localeCompare(b.name));
    return stationsToFilter;
  }, [allStations, selectedSystem, searchText]); // Depends on filters + full list

  // --- Manual Refresh Handler ---
  const handleRefresh = useCallback(async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing station list...",
    });

    try {
      // Clear the single cache entry
      await LocalStorage.removeItem(ALL_STATIONS_CACHE_KEY);
      await LocalStorage.removeItem(ALL_STATIONS_TIMESTAMP_KEY);
      // Reload data and pass the toast instance
      await loadStations(toast); // Pass toast, await completion
    } catch (error) {
      // If loadStations itself throws (e.g., before fetch even starts)
      if (toast) {
        toast.style = Toast.Style.Failure;
        toast.title = "Refresh Error";
        toast.message = error instanceof Error ? error.message : "Unknown refresh error";
      }
    }
  }, [loadStations]); // Depends only on the stable loadStations function

  // Determine which view mode to use
  const isUnfilteredView = searchText === "" && selectedSystem === "All";

  // Determine empty states
  const noStationsLoaded = !isLoading && allStations.length === 0;
  // Check if the list is empty *after* applying the relevant filtering logic for the current view
  const isEmpty =
    !isLoading &&
    (isUnfilteredView ? favoriteStations.length === 0 && otherStations.length === 0 : filteredStations.length === 0) &&
    !noStationsLoaded;

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search stations by name..."
      navigationTitle={systemFilterDisplayNames[selectedSystem]}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Transit System"
          storeValue={true}
          onChange={(newValue) => {
            setSelectedSystem(newValue as SystemFilterValue);
          }}
          value={selectedSystem}
        >
          <List.Dropdown.Section title="Filter by System">
            {systemFilters.map((filter) => (
              <List.Dropdown.Item
                key={filter}
                title={systemFilterDisplayNames[filter]}
                value={filter}
                icon={
                  filter === "SUBWAY"
                    ? Icon.Train
                    : filter === "LIRR"
                      ? Icon.Train
                      : filter === "MNR"
                        ? Icon.Train
                        : Icon.BulletPoints // "All"
                }
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {noStationsLoaded ? (
        <List.EmptyView
          icon={Icon.Train}
          title="No Stations Available"
          description="Could not load any station data. Please check your API connection or try refreshing."
        />
      ) : isEmpty ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Matching Stations"
          description="Couldn't find stations matching your filter/search."
        />
      ) : isUnfilteredView ? (
        // *** Render two sections when NO filters are active ***
        <>
          {/* Only show Favorites section if there are any */}
          {favoriteStations.length > 0 && (
            <List.Section title="Favorites" subtitle={`${favoriteStations.length}`}>
              {favoriteStations.map((station) => (
                <StationListItem
                  key={`fav-${station.id}`}
                  station={station}
                  isFavorite={true} // We know these are favorites
                  addFavorite={addFavorite}
                  removeFavorite={removeFavorite}
                  onRefreshActionInItem={handleRefresh}
                />
              ))}
            </List.Section>
          )}
          {/* Only show Other Stations section if there are any */}
          {otherStations.length > 0 && (
            <List.Section
              // Adjust title based on whether favorites were shown
              title={favoriteStations.length > 0 ? "Other Stations" : "All Stations"}
              subtitle={`${otherStations.length}`}
            >
              {otherStations.map((station) => (
                <StationListItem
                  key={`other-${station.id}`}
                  station={station}
                  isFavorite={false} // We know these are not favorites
                  addFavorite={addFavorite}
                  removeFavorite={removeFavorite}
                  onRefreshActionInItem={handleRefresh}
                />
              ))}
            </List.Section>
          )}
        </>
      ) : (
        // *** Render ONE section when ANY filter is active ***
        <List.Section title="Matching Stations" subtitle={`${filteredStations.length} found`}>
          {filteredStations.map((station) => (
            <StationListItem
              key={`filtered-${station.id}`}
              station={station}
              isFavorite={isFavorite(station.id)} // Need to check favorite status here
              addFavorite={addFavorite}
              removeFavorite={removeFavorite}
              onRefreshActionInItem={handleRefresh}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

// Station List Item component - Needs isFavorite prop again
interface FinalStationListItemProps extends StationListItemProps {
  isFavorite: boolean;
  addFavorite: (id: string) => void;
  removeFavorite: (id: string) => void;
  onRefreshActionInItem: () => void;
}

function StationListItem({
  station,
  isFavorite,
  addFavorite,
  removeFavorite,
  onRefreshActionInItem,
}: FinalStationListItemProps) {
  // Update props type
  const accessories: List.Item.Accessory[] = [];

  if (isFavorite) {
    accessories.push({
      icon: { source: Icon.Star, tintColor: Color.Yellow },
      tooltip: "Favorite Station",
    });
  }

  // Add Lines Accessory
  if (station.lines && station.lines.length > 0) {
    accessories.push({
      tag: { value: station.lines.join(" "), color: Color.PrimaryText },
      tooltip: `Lines: ${station.lines.join(", ")}`,
      icon: Icon.Train,
    });
  }

  // Add System Accessory
  if (station.system) {
    let systemColor = Color.SecondaryText;
    if (station.system === "SUBWAY") systemColor = Color.Blue;
    else if (station.system === "LIRR") systemColor = Color.Green;
    else if (station.system === "MNR") systemColor = Color.Red;
    accessories.push({
      tag: {
        value: systemFilterDisplayNames[station.system as keyof typeof systemFilterDisplayNames],
        color: systemColor,
      },
    });
    if (showAccessibilityStatus && station.accessibilityStatus) {
      let icon = Icon.Info;
      let color = Color.SecondaryText;
      let tooltip = station.accessibilityStatus;

      switch (station.accessibilityStatus) {
        case "Fully Accessible":
          icon = Icon.CheckCircle;
          color = Color.Green;
          break;
        case "Partially Accessible":
          icon = Icon.Warning;
          color = Color.Orange;
          tooltip = station.accessibilityNotes || "Some accessibility limitations";
          break;
        case "Not Accessible":
          icon = Icon.XMarkCircle;
          color = Color.Red;
          break;
        case "Information Unavailable":
        default:
          icon = Icon.QuestionMarkCircle;
          color = Color.SecondaryText;
          break;
      }

      accessories.push({
        icon,
        tag: { value: station.accessibilityStatus, color },
        tooltip,
      });
    }
  }

  return (
    <List.Item
      title={station.name}
      icon={Icon.Pin}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Station Actions">
            <Action.Push
              title="View Departures"
              icon={Icon.Clock}
              target={
                <StationDepartures
                  station={{
                    id: station.id,
                    name: station.name,
                    system: station.system as FilterableSystem,
                    accessibilityStatus: station.accessibilityStatus,
                    accessibilityNotes: station.accessibilityNotes,
                  }}
                />
              }
            />
            <Action.Push
              title="View Station Alerts"
              icon={Icon.Bell}
              target={<ViewAlertsCommand initialFilterStationId={station.id} />}
            />
            {isFavorite ? (
              <Action
                title="Remove from Favorites"
                icon={Icon.StarDisabled}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                onAction={() => removeFavorite(station.id)}
              />
            ) : (
              <Action
                title="Add to Favorites"
                icon={Icon.Star}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
                onAction={() => addFavorite(station.id)}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section title="Other Actions">
            <Action
              title="Refresh Station List"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onRefreshActionInItem}
            />
            <Action.Push title="View All Service Alerts" icon={Icon.Bell} target={<ViewAlertsCommand />} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
