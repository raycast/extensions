import { Grid, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";

import { filterAnimeByStreamingPlatform, searchAnime, StreamingPlatformFilter } from "./anilist";
import { AnimeGridItem, AnimeListItem } from "./anime-components";
import { ErrorView } from "./error-view";
import { PreferencesGate, ResolvedPreferences } from "./preferences";
import { GridStreamingFilterDropdown, ListStreamingFilterDropdown } from "./streaming-filter";

export default function Command() {
  return <PreferencesGate>{(preferences) => <SearchAnimeContent {...preferences} />}</PreferencesGate>;
}

function SearchAnimeContent({ preferences, revalidate, isLoadingPreferences }: ResolvedPreferences) {
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState<StreamingPlatformFilter>("all");
  const query = searchText.trim();
  const {
    data = [],
    error,
    isLoading,
    revalidate: retrySearch,
  } = usePromise(searchAnime, [query], {
    execute: query.length > 0,
  });
  const filteredAnime = filterAnimeByStreamingPlatform(data, filter);

  if (preferences.preferredView === "gallery") {
    return (
      <Grid
        isLoading={isLoading || isLoadingPreferences}
        searchBarPlaceholder="Search anime on AniList..."
        onSearchTextChange={setSearchText}
        searchBarAccessory={<GridStreamingFilterDropdown value={filter} onChange={setFilter} />}
        throttle
        columns={5}
        aspectRatio="2/3"
        fit={Grid.Fit.Fill}
      >
        {error ? (
          <ErrorView isGallery description={error.message} onRetry={retrySearch} title="Could Not Search Anime" />
        ) : isLoading && filteredAnime.length === 0 ? (
          <Grid.EmptyView title="Loading Anime..." description="Fetching results from AniList." />
        ) : query.length === 0 ? (
          <Grid.EmptyView title="Search for Anime" description="Type a title to query AniList." />
        ) : (
          filteredAnime.map((anime) => (
            <AnimeGridItem key={anime.id} anime={anime} preferences={preferences} onPreferencesChange={revalidate} />
          ))
        )}
      </Grid>
    );
  }

  return (
    <List
      isLoading={isLoading || isLoadingPreferences}
      searchBarPlaceholder="Search anime on AniList..."
      onSearchTextChange={setSearchText}
      searchBarAccessory={<ListStreamingFilterDropdown value={filter} onChange={setFilter} />}
      throttle
    >
      {error ? (
        <ErrorView description={error.message} onRetry={retrySearch} title="Could Not Search Anime" />
      ) : isLoading && filteredAnime.length === 0 ? (
        <List.EmptyView title="Loading Anime..." description="Fetching results from AniList." />
      ) : query.length === 0 ? (
        <List.EmptyView title="Search for Anime" description="Type a title to query AniList." />
      ) : (
        filteredAnime.map((anime) => (
          <AnimeListItem key={anime.id} anime={anime} preferences={preferences} onPreferencesChange={revalidate} />
        ))
      )}
    </List>
  );
}
