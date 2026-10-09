import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { SeasonGrid } from "./components/season-grid";
import { initTraktClient } from "./lib/client";
import { TRAKT_APP_URL } from "./lib/constants";
import { getTraktUrl } from "./lib/helper";
import {
  calendarWindow,
  daysToWeekEnd,
  inWindow,
  localToday,
  settleCalendarHalves,
  toTraktQuery,
} from "./tools/calendar-window";
import {
  CompactCalendarEpisode,
  CompactCalendarMovie,
  toCompactCalendarEpisode,
  toCompactCalendarMovie,
} from "./tools/compact-media";

type Range = "week" | "7" | "14" | "32";

const RANGES: { value: Range; title: string }[] = [
  { value: "week", title: "This Week" },
  { value: "7", title: "Next 7 Days" },
  { value: "14", title: "Next 14 Days" },
  { value: "32", title: "Next 32 Days" },
];

type Day = { date: string; episodes: CompactCalendarEpisode[]; movies: CompactCalendarMovie[] };

const dayTitle = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

const code = (episode: CompactCalendarEpisode) =>
  `S${String(episode.season).padStart(2, "0")}E${String(episode.number).padStart(2, "0")}`;

export default function Command() {
  const [range, setRange] = useState<Range>("week");
  const traktClient = initTraktClient();

  const { isLoading, data } = useCachedPromise(
    async (range: Range) => {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const startDate = localToday(timeZone);
      const days = range === "week" ? daysToWeekEnd(startDate) : Number(range);
      const window = calendarWindow(startDate, days, timeZone);
      const params = toTraktQuery(window);

      const [episodesResult, moviesResult] = await Promise.allSettled([
        traktClient.shows.getMyCalendarShows({ params }).then((response) => {
          if (response.status !== 200) throw new Error("Could not load upcoming episodes");
          return response.body
            .map((item) => toCompactCalendarEpisode(item, timeZone))
            .filter((item): item is CompactCalendarEpisode => item !== undefined && inWindow(item.localDate, window));
        }),
        traktClient.movies.getMyCalendarMovies({ params }).then((response) => {
          if (response.status !== 200) throw new Error("Could not load upcoming movies");
          return response.body
            .map(toCompactCalendarMovie)
            .filter((item): item is CompactCalendarMovie => item !== undefined && inWindow(item.releaseDate, window));
        }),
      ]);
      const { episodes, movies, warning } = settleCalendarHalves("all", episodesResult, moviesResult);

      const byDate = new Map<string, Day>();
      const day = (date: string) => byDate.get(date) ?? byDate.set(date, { date, episodes: [], movies: [] }).get(date)!;
      episodes.forEach((episode) => day(episode.localDate).episodes.push(episode));
      movies.forEach((movie) => day(movie.releaseDate).movies.push(movie));
      const sorted = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
      sorted.forEach((entry) => entry.episodes.sort((a, b) => a.localTime.localeCompare(b.localTime)));

      return { days: sorted, warning };
    },
    [range],
    { keepPreviousData: true, failureToastOptions: { title: "Could not load your calendar" } },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter upcoming episodes and movies"
      searchBarAccessory={
        <List.Dropdown tooltip="Period" value={range} onChange={(value) => setRange(value as Range)}>
          {RANGES.map((option) => (
            <List.Dropdown.Item key={option.value} value={option.value} title={option.title} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Calendar}
        title="Nothing coming up"
        description={data?.warning ?? "Only shows you watch or watchlisted, and their movies, appear here."}
      />
      {data?.days.map((entry) => (
        <List.Section key={entry.date} title={dayTitle(entry.date)}>
          {entry.episodes.map((episode) => (
            <List.Item
              key={`episode-${episode.episodeTraktId}`}
              icon={Icon.Monitor}
              title={episode.showTitle}
              subtitle={`${code(episode)}${episode.episodeTitle ? ` · ${episode.episodeTitle}` : ""}`}
              accessories={[{ text: episode.localTime, icon: Icon.Clock }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    icon={Icon.Switch}
                    title="Browse Seasons"
                    target={
                      <SeasonGrid
                        showId={episode.showTraktId}
                        slug={episode.showSlug}
                        imdbId={episode.showImdbId ?? ""}
                      />
                    }
                  />
                  <Action.OpenInBrowser
                    icon={getFavicon(TRAKT_APP_URL)}
                    title="Open in Trakt"
                    url={getTraktUrl("shows", episode.showSlug)}
                  />
                </ActionPanel>
              }
            />
          ))}
          {entry.movies.map((movie) => (
            <List.Item
              key={`movie-${movie.traktId}`}
              icon={Icon.FilmStrip}
              title={movie.title}
              subtitle={movie.year?.toString()}
              accessories={[{ tag: "Release" }]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    icon={getFavicon(TRAKT_APP_URL)}
                    title="Open in Trakt"
                    url={getTraktUrl("movies", movie.slug)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
