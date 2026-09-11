import { Grid, List } from "@raycast/api";

import { formatAiringClock, getLocalDayTimestamps } from "./anilist";
import { AnimeGridItem, AnimeListItem } from "./anime-components";
import { ErrorView } from "./error-view";
import { GridStreamingFilterDropdown, ListStreamingFilterDropdown } from "./streaming-filter";
import { useAiringEpisodesCommand } from "./use-filtered-airing-episodes";

export default function Command() {
  const command = useAiringEpisodesCommand(getLocalDayTimestamps());
  if (command.status === "gate") {
    return command.view;
  }

  const {
    preferences,
    revalidate,
    isLoadingPreferences,
    filter,
    setFilter,
    filteredEpisodes,
    error,
    isLoading,
    retryEpisodes,
  } = command;

  if (preferences.preferredView === "gallery") {
    return (
      <Grid
        isLoading={isLoading || isLoadingPreferences}
        searchBarPlaceholder="Filter today's episodes..."
        searchBarAccessory={<GridStreamingFilterDropdown value={filter} onChange={setFilter} />}
        columns={5}
        aspectRatio="2/3"
        fit={Grid.Fit.Fill}
      >
        {error ? (
          <ErrorView isGallery description={error.message} onRetry={retryEpisodes} title="Could Not Load Episodes" />
        ) : isLoading && filteredEpisodes.length === 0 ? (
          <Grid.EmptyView
            title="Loading Today's Episodes..."
            description="Fetching the airing schedule from AniList."
          />
        ) : (
          filteredEpisodes.map((episode) => (
            <AnimeGridItem
              key={episode.id}
              anime={episode.media}
              preferences={preferences}
              onPreferencesChange={revalidate}
              subtitle={`Episode ${episode.episode} · ${formatAiringClock(episode.airingAt)}`}
            />
          ))
        )}
      </Grid>
    );
  }

  return (
    <List
      isLoading={isLoading || isLoadingPreferences}
      searchBarPlaceholder="Filter today's episodes..."
      searchBarAccessory={<ListStreamingFilterDropdown value={filter} onChange={setFilter} />}
    >
      {error ? (
        <ErrorView description={error.message} onRetry={retryEpisodes} title="Could Not Load Episodes" />
      ) : isLoading && filteredEpisodes.length === 0 ? (
        <List.EmptyView title="Loading Today's Episodes..." description="Fetching the airing schedule from AniList." />
      ) : (
        filteredEpisodes.map((episode) => (
          <AnimeListItem
            key={episode.id}
            anime={episode.media}
            preferences={preferences}
            onPreferencesChange={revalidate}
            subtitle={`Episode ${episode.episode} · ${formatAiringClock(episode.airingAt)}`}
          />
        ))
      )}
    </List>
  );
}
