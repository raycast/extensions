import {
  CalendarType,
  calendarWindow,
  inWindow,
  MAX_CALENDAR_DAYS,
  MAX_CALENDAR_LIMIT,
  parseStartDate,
  resolveDays,
  resolveLimit,
  settleCalendarHalves,
  toTraktQuery,
  truncateList,
  truncationNote,
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
   * First day of the calendar in the user's time zone, as YYYY-MM-DD (e.g. "2026-10-20"), only when the user
   * names a specific date. Omit for today; never pass a guessed current date.
   */
  startDate?: string;
  /**
   * Number of days to cover, starting at `startDate` (default: 7, max: 32).
   */
  days?: number;
  /**
   * Maximum entries per list, episodes and movies each, earliest first (default: 50, max: 200).
   */
  limit?: number;
};

type Output = {
  /** The local days covered, both ends inclusive, in the user's time zone. */
  window: {
    startDate: string;
    endDate: string;
    days: number;
    timeZone: string;
    daysCapped?: boolean;
    limitCapped?: boolean;
  };
  /** Episodes airing in the window, in local date and time order, at most `limit`. Empty when `type` is "movies". */
  episodes: CompactCalendarEpisode[];
  /** Movies released in the window, by release date, at most `limit`. Empty when `type` is "shows". */
  movies: CompactCalendarMovie[];
  /** Episodes and movies in the window before `limit` was applied. */
  totalEpisodes: number;
  totalMovies: number;
  /** Set when `limit` cut at least one list: the message names the last date each cut list reaches. */
  truncated?: true;
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
  const { limit, capped: limitCapped } = resolveLimit(input.limit);
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
  const settled = settleCalendarHalves(type, episodesResult, moviesResult);
  const episodes = truncateList(settled.episodes, limit, (item) => item.localDate);
  const movies = truncateList(settled.movies, limit, (item) => item.releaseDate);
  const truncated = episodes.truncated || movies.truncated;

  const counts = [
    type !== "movies" ? `${episodes.total} episode(s)` : undefined,
    type !== "shows" ? `${movies.total} movie(s)` : undefined,
  ].filter(Boolean);
  const message = [
    `${counts.join(" and ")} from ${window.startDate} to ${window.endDate} (${timeZone}).`,
    "Only titles Trakt tracks for this account appear: shows they watched or watchlisted (minus shows hidden from the calendar) and their movies. An empty result does not mean nothing else comes out.",
    truncationNote("Episodes", episodes),
    truncationNote("Movies", movies),
    truncated ? "Narrow days or raise limit." : undefined,
    capped ? `days was capped at ${MAX_CALENDAR_DAYS}.` : undefined,
    limitCapped ? `limit was capped at ${MAX_CALENDAR_LIMIT}.` : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    window: { ...window, ...(capped && { daysCapped: true }), ...(limitCapped && { limitCapped: true }) },
    episodes: episodes.items,
    movies: movies.items,
    totalEpisodes: episodes.total,
    totalMovies: movies.total,
    ...(truncated && { truncated: true as const }),
    message,
    ...(settled.warning && { warning: settled.warning }),
  };
}
