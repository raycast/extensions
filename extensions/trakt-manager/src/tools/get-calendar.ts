import {
  CalendarType,
  calendarWindow,
  inWindow,
  MAX_CALENDAR_DAYS,
  parseStartDate,
  resolveDays,
  settleCalendarHalves,
  toTraktQuery,
} from "./calendar-window";
import {
  CompactCalendarEpisode,
  CompactCalendarMovie,
  toCompactCalendarEpisode,
  toCompactCalendarMovie,
} from "./compact-media";
import { executeToolCall, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * What to include: "shows" (upcoming episodes), "movies" (upcoming releases), or "all" for both.
   * Defaults to "all".
   */
  type?: CalendarType;
  /**
   * First day of the calendar in the user's time zone, as YYYY-MM-DD (e.g. "2026-10-20").
   * Defaults to today.
   */
  startDate?: string;
  /**
   * Number of days to cover, starting at `startDate` (default: 7, max: 32).
   */
  days?: number;
};

type Output = {
  /** The local days covered, both ends inclusive, in the user's time zone. */
  window: { startDate: string; endDate: string; days: number; timeZone: string; daysCapped?: boolean };
  /** Episodes airing in the window, in local date and time order. Empty when `type` is "movies". */
  episodes: CompactCalendarEpisode[];
  /** Movies released in the window, by release date. Empty when `type` is "shows". */
  movies: CompactCalendarMovie[];
  message: string;
  /** Set when one half of an "all" request failed: the other half is still returned. */
  warning?: string;
};

function bySortKey<T>(key: (item: T) => string) {
  return (a: T, b: T) => key(a).localeCompare(key(b));
}

/**
 * Get the user's Trakt calendar: upcoming episodes of the shows they watched or watchlisted, and upcoming movie
 * releases, over a period of local days. Episode times are converted to the user's time zone.
 */
export default async function tool(input: Input): Promise<Output> {
  const { type = "all" } = input;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const startDate = parseStartDate(input.startDate, timeZone);
  const { days, capped } = resolveDays(input.days);
  const window = calendarWindow(startDate, days, timeZone);
  const params = toTraktQuery(window);

  const fetchEpisodes = async () => {
    const response = await executeToolCall(
      (signal) => toolTraktClient.shows.getMyCalendarShows({ params, fetchOptions: { signal } }),
      "Failed to fetch upcoming episodes",
    );
    return response.body
      .map((item) => toCompactCalendarEpisode(item, timeZone))
      .filter((item): item is CompactCalendarEpisode => item !== undefined && inWindow(item.localDate, window))
      .sort(bySortKey((item) => `${item.localDate} ${item.localTime} ${item.showTitle}`));
  };

  const fetchMovies = async () => {
    const response = await executeToolCall(
      (signal) => toolTraktClient.movies.getMyCalendarMovies({ params, fetchOptions: { signal } }),
      "Failed to fetch upcoming movies",
    );
    return response.body
      .map(toCompactCalendarMovie)
      .filter((item): item is CompactCalendarMovie => item !== undefined && inWindow(item.releaseDate, window))
      .sort(bySortKey((item) => `${item.releaseDate} ${item.title}`));
  };

  const [episodesResult, moviesResult] = await Promise.allSettled([
    type === "movies" ? [] : fetchEpisodes(),
    type === "shows" ? [] : fetchMovies(),
  ]);
  const { episodes, movies, warning } = settleCalendarHalves(type, episodesResult, moviesResult);

  const counts = [
    type !== "movies" ? `${episodes.length} episode(s)` : undefined,
    type !== "shows" ? `${movies.length} movie(s)` : undefined,
  ].filter(Boolean);
  const message = [
    `${counts.join(" and ")} from ${window.startDate} to ${window.endDate} (${timeZone}).`,
    "Only titles Trakt tracks for this account appear: shows they watched or watchlisted (minus shows hidden from the calendar) and their movies. An empty result does not mean nothing else comes out.",
    capped ? `days was capped at ${MAX_CALENDAR_DAYS}.` : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    window: capped ? { ...window, daysCapped: true } : window,
    episodes,
    movies,
    message,
    ...(warning && { warning }),
  };
}
