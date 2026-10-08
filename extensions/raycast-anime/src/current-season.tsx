import { Grid, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import {
  Anime,
  formatAiringClock,
  formatWeekday,
  filterAnimeByStreamingPlatform,
  getCurrentAnimeSeason,
  getCurrentSeasonAnime,
  StreamingPlatformFilter,
} from "./anilist";
import { AnimeGridItem, AnimeListItem } from "./anime-components";
import { ErrorView } from "./error-view";
import { formatCountSubtitle } from "./format-utils";
import { PreferencesGate, ResolvedPreferences } from "./preferences";
import { GridStreamingFilterDropdown, ListStreamingFilterDropdown } from "./streaming-filter";

export default function Command() {
  return <PreferencesGate>{(preferences) => <CurrentSeasonContent {...preferences} />}</PreferencesGate>;
}

function CurrentSeasonContent({ preferences, revalidate, isLoadingPreferences }: ResolvedPreferences) {
  const [filter, setFilter] = useState<StreamingPlatformFilter>("all");
  const { season, year } = getCurrentAnimeSeason();
  const {
    data = [],
    error,
    isLoading,
    revalidate: retryEpisodes,
  } = useCachedPromise(getCurrentSeasonAnime, [season, year]);
  const filteredAnime = filterAnimeByStreamingPlatform(data, filter);
  const sections = groupByAiringDay(filteredAnime);

  if (preferences.preferredView === "gallery") {
    return (
      <Grid
        isLoading={isLoading || isLoadingPreferences}
        searchBarPlaceholder={`Filter ${season.toLowerCase()} ${year}...`}
        searchBarAccessory={<GridStreamingFilterDropdown value={filter} onChange={setFilter} />}
        columns={5}
        aspectRatio="2/3"
        fit={Grid.Fit.Fill}
      >
        {error ? (
          <ErrorView
            isGallery
            description={error.message}
            onRetry={retryEpisodes}
            title="Could Not Load Current Season"
          />
        ) : isLoading && sections.length === 0 ? (
          <Grid.EmptyView title="Loading Current Season..." description="Fetching airing anime from AniList." />
        ) : (
          sections.map((section) => (
            <Grid.Section
              key={section.title}
              title={formatSectionTitle(section.title)}
              subtitle={formatCountSubtitle(section.items.length, "show", "shows")}
            >
              {section.items.map((anime) => (
                <AnimeGridItem
                  key={anime.id}
                  anime={anime}
                  preferences={preferences}
                  onPreferencesChange={revalidate}
                  subtitle={
                    anime.nextAiringEpisode ? formatAiringClock(anime.nextAiringEpisode.airingAt) : "Schedule Unknown"
                  }
                />
              ))}
            </Grid.Section>
          ))
        )}
      </Grid>
    );
  }

  return (
    <List
      isLoading={isLoading || isLoadingPreferences}
      searchBarPlaceholder={`Filter ${season.toLowerCase()} ${year}...`}
      searchBarAccessory={<ListStreamingFilterDropdown value={filter} onChange={setFilter} />}
    >
      {error ? (
        <ErrorView description={error.message} onRetry={retryEpisodes} title="Could Not Load Current Season" />
      ) : isLoading && sections.length === 0 ? (
        <List.EmptyView title="Loading Current Season..." description="Fetching airing anime from AniList." />
      ) : (
        sections.map((section) => (
          <List.Section
            key={section.title}
            title={formatSectionTitle(section.title)}
            subtitle={formatCountSubtitle(section.items.length, "show", "shows")}
          >
            {section.items.map((anime) => (
              <AnimeListItem
                key={anime.id}
                anime={anime}
                preferences={preferences}
                onPreferencesChange={revalidate}
                subtitle={
                  anime.nextAiringEpisode ? `Airs at ${formatAiringClock(anime.nextAiringEpisode.airingAt)}` : undefined
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}

function formatSectionTitle(title: string) {
  return title === "Schedule Unknown" ? title.toUpperCase() : `AIRING ${title.toUpperCase()}`;
}

function groupByAiringDay(anime: Anime[]) {
  const sortedAnime = [...anime].sort((first, second) => {
    const firstAiring = first.nextAiringEpisode?.airingAt ?? Number.MAX_SAFE_INTEGER;
    const secondAiring = second.nextAiringEpisode?.airingAt ?? Number.MAX_SAFE_INTEGER;
    return firstAiring - secondAiring;
  });
  const sections = new Map<string, Anime[]>();

  for (const item of sortedAnime) {
    const title = formatWeekday(item.nextAiringEpisode?.airingAt);
    sections.set(title, [...(sections.get(title) ?? []), item]);
  }

  return Array.from(sections.entries()).map(([title, items]) => ({ title, items }));
}
