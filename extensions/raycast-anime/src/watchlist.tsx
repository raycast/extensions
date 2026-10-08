import { Grid, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import { filterAnimeByStreamingPlatform, StreamingPlatformFilter } from "./anilist";
import { AnimeGridItem, AnimeListItem } from "./anime-components";
import { PreferencesGate, ResolvedPreferences } from "./preferences";
import { GridStreamingFilterDropdown, ListStreamingFilterDropdown } from "./streaming-filter";
import { getWatchlist } from "./watchlist-storage";

export default function Command() {
  return <PreferencesGate>{(preferences) => <WatchlistContent {...preferences} />}</PreferencesGate>;
}

function WatchlistContent({
  preferences,
  revalidate: revalidatePreferences,
  isLoadingPreferences,
}: ResolvedPreferences) {
  const [filter, setFilter] = useState<StreamingPlatformFilter>("all");
  const { data = [], isLoading, revalidate } = useCachedPromise(getWatchlist);
  const filteredAnime = filterAnimeByStreamingPlatform(data, filter);

  if (preferences.preferredView === "gallery") {
    return (
      <Grid
        isLoading={isLoading || isLoadingPreferences}
        searchBarPlaceholder="Filter watchlist..."
        searchBarAccessory={<GridStreamingFilterDropdown value={filter} onChange={setFilter} />}
        columns={5}
        aspectRatio="2/3"
        fit={Grid.Fit.Fill}
      >
        {isLoading && filteredAnime.length === 0 ? (
          <Grid.EmptyView title="Loading Watchlist..." />
        ) : filteredAnime.length === 0 ? (
          <Grid.EmptyView
            title="Your Watchlist Is Empty"
            description="Save anime from Search Anime or Current Season."
          />
        ) : (
          filteredAnime.map((anime) => (
            <AnimeGridItem
              key={anime.id}
              anime={anime}
              preferences={preferences}
              onPreferencesChange={revalidatePreferences}
              onWatchlistChange={revalidate}
              showRemoveFromWatchlist
            />
          ))
        )}
      </Grid>
    );
  }

  return (
    <List
      isLoading={isLoading || isLoadingPreferences}
      searchBarPlaceholder="Filter watchlist..."
      searchBarAccessory={<ListStreamingFilterDropdown value={filter} onChange={setFilter} />}
    >
      {isLoading && filteredAnime.length === 0 ? (
        <List.EmptyView title="Loading Watchlist..." />
      ) : filteredAnime.length === 0 ? (
        <List.EmptyView title="Your Watchlist Is Empty" description="Save anime from Search Anime or Current Season." />
      ) : (
        filteredAnime.map((anime) => (
          <AnimeListItem
            key={anime.id}
            anime={anime}
            preferences={preferences}
            onPreferencesChange={revalidatePreferences}
            onWatchlistChange={revalidate}
            showRemoveFromWatchlist
          />
        ))
      )}
    </List>
  );
}
