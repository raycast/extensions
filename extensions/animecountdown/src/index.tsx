import {
  Action,
  ActionPanel,
  Grid,
  Icon,
  List,
  getPreferenceValues,
} from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimeViewType, AnimeItemJSON } from "./types/anime";
import { AnimeGridItem } from "./components/AnimeGridItem";
import { AnimeListItem } from "./components/AnimeListItem";
import { AnimeConfig } from "./config/animeConfig";
import { CONSTANTS } from "./config/constants";
import { AnimeItem } from "./models/AnimeItem";

/**
 * Main command component for the Anime Countdown Raycast extension.
 * Handles the high-level application state, including:
 * - Data fetching and revalidation via `usePromise`
 * - Persistence of cached anime items and "Last Updated" timestamps
 * - Dynamic view switching (Trending/Upcoming)
 * - Sorting and layout toggling (List/Grid)
 * - Navigation title updates based on sync status
 */
export default function AnimeCountdownCommand() {
  const preferences = getPreferenceValues<Preferences>();
  const [viewType, setViewType] = useState<AnimeViewType>(
    (preferences.viewType as AnimeViewType) || AnimeViewType.TRENDING,
  );
  const [sortByHype, setSortByHype] = useState(false);
  const [layout, setLayout] = useState<"list" | "grid">(
    preferences.layout || "list",
  );
  const [now, setNow] = useState(Date.now());

  // Customization from preferences
  const gridColumns =
    parseInt(preferences.gridColumns || "4", 10) ||
    CONSTANTS.UI.DEFAULT_GRID_COLUMNS;

  // Persistence: Store the last fetched anime items and the last update time
  const [cachedAnime, setCachedAnime] = useCachedState<
    Record<string, AnimeItemJSON[]>
  >(CONSTANTS.CACHE.KEY, {});
  const [lastUpdated, setLastUpdated] = useCachedState<Record<string, number>>(
    "last-updated",
    {},
  );

  // Memoize service to prevent recreation on every render
  const animeService = useMemo(() => AnimeConfig.getAnimeService(), []);

  // Fetch function memoized with useCallback
  const fetchAnime = useCallback(
    async (type: AnimeViewType): Promise<AnimeItem[]> => {
      return await animeService.fetchAnime(type);
    },
    [animeService],
  );

  const { data, isLoading, error, revalidate } = usePromise(
    fetchAnime,
    [viewType],
    {
      onData: (items: AnimeItem[]) => {
        setCachedAnime((prev) => {
          const currentCached = prev[viewType] || [];
          const hasChanged =
            currentCached.length !== items.length ||
            items.some(
              (item, index) =>
                !currentCached[index] || currentCached[index].id !== item.id,
            );

          if (!hasChanged) return prev;

          // Only update lastUpdated if data actually changed to reduce re-renders
          setLastUpdated((prevUpdated) => ({
            ...prevUpdated,
            [viewType]: Date.now(),
          }));

          return {
            ...prev,
            [viewType]: items.map(
              (i) => i.toJSON() as unknown as AnimeItemJSON,
            ),
          };
        });
      },
    },
  );

  // Update countdown every second
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const isTrending = viewType === AnimeViewType.TRENDING;
  const updateTime = lastUpdated[viewType];
  const lastUpdatedText = updateTime
    ? `Updated ${new Date(updateTime).toLocaleTimeString()}`
    : "";

  const cachedItemsForView = cachedAnime[viewType];

  // Memoize items and map them to class instances
  const animeItems = useMemo(() => {
    const rawItems = (data || cachedItemsForView || []) as (
      | AnimeItem
      | AnimeItemJSON
    )[];
    const items = rawItems.map((item) =>
      item instanceof AnimeItem
        ? item
        : AnimeItem.fromJSON(item as unknown as Record<string, unknown>),
    );

    if (sortByHype && viewType === AnimeViewType.TRENDING) {
      return [...items].sort((a, b) => b.hotPercentage - a.hotPercentage);
    }

    return items;
  }, [data, cachedItemsForView, viewType, sortByHype]);

  const toggleLayout = () =>
    setLayout((prev) => (prev === "list" ? "grid" : "list"));

  const commonProps = {
    isLoading,
    searchBarPlaceholder: `Search ${isTrending ? "trending" : "upcoming"} anime...`,
    searchBarAccessory: (
      <List.Dropdown
        tooltip="Select View"
        value={viewType}
        onChange={(newValue) => setViewType(newValue as AnimeViewType)}
      >
        <List.Dropdown.Item
          title="Trending Anime"
          value={AnimeViewType.TRENDING}
          icon={Icon.Star}
        />
        <List.Dropdown.Item
          title="Upcoming Anime"
          value={AnimeViewType.UPCOMING}
          icon={Icon.Calendar}
        />
      </List.Dropdown>
    ),
  };

  if (error && !animeItems.length) {
    return (
      <List {...commonProps}>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Network Connection Error"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Retry Connection"
                icon={Icon.ArrowClockwise}
                onAction={() => revalidate()}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const renderItem = (anime: AnimeItem) => {
    const itemProps = {
      anime,
      viewType,
      now,
      onViewTypeChange: setViewType,
      sortByHype,
      onSortToggle: () => setSortByHype(!sortByHype),
      onLayoutToggle: toggleLayout,
    };

    return layout === "grid" ? (
      <AnimeGridItem key={anime.id} {...itemProps} />
    ) : (
      <AnimeListItem key={anime.id} {...itemProps} />
    );
  };

  const navigationTitle = lastUpdatedText
    ? `${isTrending ? "Trending" : "Upcoming"} • ${lastUpdatedText}`
    : "";

  if (layout === "grid") {
    return (
      <Grid
        {...commonProps}
        columns={gridColumns}
        fit={Grid.Fit.Fill}
        navigationTitle={navigationTitle}
      >
        {animeItems.map(renderItem)}
      </Grid>
    );
  }

  return (
    <List {...commonProps} navigationTitle={navigationTitle}>
      {animeItems.map(renderItem)}
    </List>
  );
}
