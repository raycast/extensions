import { Action, ActionPanel, Grid, Icon, List, Keyboard, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { fetchStations } from "./utils/api";
import { playStation } from "./utils/player";
import { Station } from "./types/station";
import { useFavorites } from "./hooks/useFavorites";
import { getRecentlyPlayed, RecentItem, clearRecentlyPlayed } from "./utils/storage";
import { useViewMode } from "./hooks/useViewMode";
import { useViewOptions } from "./hooks/useViewOptions";

interface Preferences {
  showStationImages: boolean;
  defaultView: "grid" | "list";
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [stations, setStations] = useState<Station[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const { isFavorite, toggleFavoriteStation } = useFavorites();
  const { viewMode, toggleViewMode } = useViewMode();
  const { viewOptions, setSortBy, toggleGroupBy } = useViewOptions();

  useEffect(() => {
    loadData();

    // Auto-refresh every 30 seconds to update now playing info
    const interval = setInterval(() => {
      loadData(true); // Silent refresh - no loading indicator
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  async function loadData(silent = false) {
    if (!silent) setIsLoading(true);
    try {
      const [fetchedStations, recent] = await Promise.all([fetchStations(), getRecentlyPlayed()]);
      setStations(fetchedStations);
      setRecentlyPlayed(recent);
    } catch {
      if (!silent) {
        await showFailureToast("Check your internet connection", {
          title: "Failed to load stations",
        });
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }

  async function handleClearRecentlyPlayed() {
    try {
      await clearRecentlyPlayed();
      setRecentlyPlayed([]);
      await showToast({
        style: Toast.Style.Success,
        title: "Cleared Recently Played",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to clear recently played",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Filter stations based on search
  const filteredStations = stations.filter((station) => {
    if (!searchText) return true;

    const searchLower = searchText.toLowerCase();
    const nameMatch = station.title.toLowerCase().includes(searchLower);
    const genreMatch = station.genre.toLowerCase().includes(searchLower);
    const descriptionMatch = station.description.toLowerCase().includes(searchLower);

    return nameMatch || genreMatch || descriptionMatch;
  });

  // Separate stations into categories
  // Favorites should show ALL favorites, not just filtered ones
  const favoriteStations = stations.filter((station) => isFavorite(station.id));

  // For recently played and other stations, use filtered results
  const recentStations = filteredStations.filter((station) => {
    const isRecent = recentlyPlayed.some((item) => item.stationId === station.id);
    return isRecent; // Show ALL recently played stations, even if they're favorites
  });
  const otherStations = filteredStations.filter((station) => {
    return !isFavorite(station.id); // Show all non-favorites in "All Stations", even if recently played
  });

  // Sort each category
  const sortStations = (stationList: Station[]) => {
    return stationList.sort((a, b) => {
      let result = 0;

      if (viewOptions.sortBy === "listeners") {
        const aListeners = parseInt(a.listeners) || 0;
        const bListeners = parseInt(b.listeners) || 0;
        result = aListeners - bListeners;
      } else {
        // Sort by name
        result = a.title.localeCompare(b.title);
      }

      // Apply sort direction
      if (viewOptions.sortDirection === "desc") {
        result = -result;
      }

      // If searching, prioritize matches (overrides other sorting)
      if (searchText && viewOptions.sortBy === "name") {
        const searchLower = searchText.toLowerCase();
        const aNameMatch = a.title.toLowerCase().includes(searchLower);
        const bNameMatch = b.title.toLowerCase().includes(searchLower);

        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
      }

      return result;
    });
  };

  // Group stations by genre if enabled
  const getGenreGroups = (stationList: Station[]) => {
    if (viewOptions.groupBy !== "genre") {
      return null;
    }

    const groups = new Map<string, Station[]>();
    stationList.forEach((station) => {
      const genreString = station.genre || "Other";
      // Split genres by pipe character and trim whitespace
      const genres = genreString.split("|").map((g) => g.trim());

      // Add station to each genre group
      genres.forEach((genre) => {
        if (!groups.has(genre)) {
          groups.set(genre, []);
        }
        groups.get(genre)!.push(station);
      });
    });

    // Sort genres alphabetically and sort stations within each genre
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([genre, stations]) => ({
        genre,
        stations: sortStations(stations),
      }));
  };

  // Create a flat list of all visible stations to assign number shortcuts
  let allVisibleStations: Station[] = [];

  if (viewOptions.groupBy === "genre") {
    // When grouping by genre, collect all stations in order they appear
    const genreGroups = getGenreGroups(filteredStations);
    if (genreGroups) {
      const stationsList: Station[] = [];
      genreGroups.forEach(({ stations }) => {
        stations.forEach((station) => {
          // Only add if not already in the list (to avoid duplicate shortcuts)
          if (!stationsList.some((s) => s.id === station.id)) {
            stationsList.push(station);
          }
        });
      });
      allVisibleStations = stationsList;
    }
  } else {
    // Default grouping
    allVisibleStations = [
      ...sortStations(favoriteStations),
      ...sortStations(recentStations),
      ...sortStations(otherStations),
    ];
  }

  const stationActions = (station: Station, index?: number) => {
    // Find the station's position in the flat list
    const stationIndex = index ?? allVisibleStations.findIndex((s) => s.id === station.id);
    const numberKey = stationIndex >= 0 && stationIndex < 9 ? String(stationIndex + 1) : undefined;

    return (
      <ActionPanel>
        <Action
          title="Play Station"
          onAction={() => playStation(station)}
          icon={Icon.Play}
          shortcut={numberKey ? { modifiers: [], key: numberKey as Keyboard.KeyEquivalent } : undefined}
        />
        <Action
          title={isFavorite(station.id) ? "Remove from Favorites" : "Add to Favorites"}
          icon={Icon.Star}
          onAction={() => toggleFavoriteStation(station.id, station.title)}
          shortcut={Keyboard.Shortcut.Common.Pin}
        />
        <Action
          title={`Switch to ${viewMode === "grid" ? "List" : "Grid"} View`}
          icon={viewMode === "grid" ? Icon.List : Icon.AppWindowGrid2x2}
          onAction={toggleViewMode}
          shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
        />
        <Action.CopyToClipboard
          title="Copy Stream URL"
          content={station.playlists.find((p) => p.format === "mp3")?.url || ""}
          shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
        />
        <ActionPanel.Section>
          <Action
            title="Sort by Name"
            icon={
              viewOptions.sortBy === "name"
                ? viewOptions.sortDirection === "asc"
                  ? Icon.ArrowUp
                  : Icon.ArrowDown
                : Icon.TextCursor
            }
            onAction={() => setSortBy("name")}
            shortcut={{ modifiers: ["cmd"], key: "1" }}
          />
          <Action
            title="Sort by Listeners"
            icon={
              viewOptions.sortBy === "listeners"
                ? viewOptions.sortDirection === "asc"
                  ? Icon.ArrowDown
                  : Icon.ArrowUp
                : Icon.TwoPeople
            }
            onAction={() => setSortBy("listeners")}
            shortcut={{ modifiers: ["cmd"], key: "2" }}
          />
          <Action
            title={`${viewOptions.groupBy === "genre" ? "Ungroup" : "Group"} by Genre`}
            icon={Icon.TextDocument}
            onAction={toggleGroupBy}
            shortcut={{ modifiers: ["cmd"], key: "g" }}
          />
          <Action
            title="Refresh Stations"
            icon={Icon.ArrowClockwise}
            onAction={() => loadData()}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel.Section>
        {recentlyPlayed.length > 0 && (
          <ActionPanel.Section>
            <Action
              title="Clear Recently Played"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={handleClearRecentlyPlayed}
            />
          </ActionPanel.Section>
        )}
      </ActionPanel>
    );
  };

  const renderGridItem = (station: Station, index?: number) => {
    const nowPlaying = station.lastPlaying ? `🎵 ${station.lastPlaying}` : "";
    const subtitle = station.lastPlaying ? station.lastPlaying : `${station.genre} • ${station.listeners} listeners`;

    return (
      <Grid.Item
        key={station.id}
        content={
          preferences.showStationImages
            ? {
                value: {
                  source: station.xlimage || station.largeimage || station.image,
                  fallback: Icon.Music,
                },
                tooltip: `${station.description}\n\n${nowPlaying}\n\n${station.listeners} listeners`,
              }
            : Icon.Music
        }
        title={station.title}
        subtitle={subtitle}
        keywords={[station.genre, station.dj]}
        actions={stationActions(station, index)}
      />
    );
  };

  const renderListItem = (station: Station, index?: number) => {
    const accessories = [
      station.lastPlaying ? { text: `🎵 ${station.lastPlaying}`, tooltip: "Now Playing" } : {},
      { text: `${station.listeners} listeners` },
      isFavorite(station.id) ? { icon: { source: Icon.Star, tintColor: "#FFD700" } } : {},
    ].filter((a) => Object.keys(a).length > 0);

    return (
      <List.Item
        key={station.id}
        icon={
          preferences.showStationImages
            ? {
                source: station.image,
                fallback: Icon.Music,
              }
            : Icon.Music
        }
        title={station.title}
        subtitle={station.genre}
        keywords={[station.genre, station.dj]}
        accessories={accessories}
        actions={stationActions(station, index)}
      />
    );
  };

  if (viewMode === "grid") {
    return (
      <Grid
        columns={3}
        isLoading={isLoading}
        onSearchTextChange={setSearchText}
        searchBarPlaceholder="Search stations by name, genre, or description..."
        throttle
      >
        {favoriteStations.length > 0 && (
          <Grid.Section title="Favorites" subtitle={`${favoriteStations.length} stations`}>
            {sortStations(favoriteStations).map((station, i) => renderGridItem(station, i))}
          </Grid.Section>
        )}

        {recentStations.length > 0 && !viewOptions.groupBy && (
          <Grid.Section title="Recently Played" subtitle={`${recentStations.length} stations`}>
            {sortStations(recentStations).map((station, i) => renderGridItem(station, favoriteStations.length + i))}
          </Grid.Section>
        )}

        {viewOptions.groupBy === "genre"
          ? // Group by genre
            getGenreGroups(filteredStations)?.map(({ genre, stations }) => (
              <Grid.Section key={genre} title={genre} subtitle={`${stations.length} stations`}>
                {stations.map((station, i) => renderGridItem(station, i))}
              </Grid.Section>
            ))
          : // Default grouping
            otherStations.length > 0 && (
              <Grid.Section title="All Stations" subtitle={`${otherStations.length} stations`}>
                {sortStations(otherStations).map((station, i) =>
                  renderGridItem(station, favoriteStations.length + recentStations.length + i),
                )}
              </Grid.Section>
            )}

        {filteredStations.length === 0 && !isLoading && (
          <Grid.EmptyView
            icon={Icon.MagnifyingGlass}
            title="No Stations Found"
            description="Try adjusting your search query"
          />
        )}
      </Grid>
    );
  } else {
    return (
      <List
        isLoading={isLoading}
        onSearchTextChange={setSearchText}
        searchBarPlaceholder="Search stations by name, genre, or description..."
        throttle
      >
        {favoriteStations.length > 0 && (
          <List.Section title="Favorites" subtitle={`${favoriteStations.length} stations`}>
            {sortStations(favoriteStations).map((station, i) => renderListItem(station, i))}
          </List.Section>
        )}

        {recentStations.length > 0 && !viewOptions.groupBy && (
          <List.Section title="Recently Played" subtitle={`${recentStations.length} stations`}>
            {sortStations(recentStations).map((station, i) => renderListItem(station, favoriteStations.length + i))}
          </List.Section>
        )}

        {viewOptions.groupBy === "genre"
          ? // Group by genre
            getGenreGroups(filteredStations)?.map(({ genre, stations }) => (
              <List.Section key={genre} title={genre} subtitle={`${stations.length} stations`}>
                {stations.map((station, i) => renderListItem(station, i))}
              </List.Section>
            ))
          : // Default grouping
            otherStations.length > 0 && (
              <List.Section title="All Stations" subtitle={`${otherStations.length} stations`}>
                {sortStations(otherStations).map((station, i) =>
                  renderListItem(station, favoriteStations.length + recentStations.length + i),
                )}
              </List.Section>
            )}

        {filteredStations.length === 0 && !isLoading && (
          <List.EmptyView
            icon={Icon.MagnifyingGlass}
            title="No Stations Found"
            description="Try adjusting your search query"
          />
        )}
      </List>
    );
  }
}
