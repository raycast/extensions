import { withPagination } from "../lib/schema";
import { CompactHistoryItem, toCompactMovieHistory, toCompactShowHistory } from "./compact-media";
import { normalizeTitle, searchMovieCandidates, searchShowCandidates } from "./resolve-media";
import { executeToolCall, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * Filter history by media type: "movies", "shows", or "all".
   * Defaults to "all".
   */
  type?: "movies" | "shows" | "all";
  /**
   * Title to look up in your complete watch history (e.g. "Green Book", "Breaking Bad").
   * Use this to answer "have I watched X?" or "when did I watch X?".
   * The lookup is EXHAUSTIVE: it resolves the title to a Trakt ID and queries the full
   * history for that exact item, so a negative answer is authoritative.
   */
  query?: string;
  /**
   * Optional release year to disambiguate titles that exist in several versions (e.g. Dune 1984 vs 2021).
   */
  year?: number;
  /**
   * Optional Trakt ID of a movie or show to look up directly. Skips title resolution.
   */
  traktId?: number;
  /**
   * The page number when browsing recent history. Defaults to 1.
   */
  page?: number;
  /**
   * Number of items to return per page (default: 20, max: 50).
   */
  limit?: number;
};

type WatchCheck = {
  type: "movie" | "show";
  title: string;
  year?: number;
  traktId: number;
  watched: boolean;
  /**
   * Total recorded watch events for this item (episode plays for a show).
   */
  plays: number;
  lastWatchedAt?: string;
  firstWatchedAt?: string;
};

type Output = {
  /**
   * "lookup" when checking specific titles, "browse" when listing recent history.
   */
  mode: "lookup" | "browse";
  /**
   * True when the answer covers the ENTIRE history and can be trusted as definitive.
   */
  exhaustive: boolean;
  found?: boolean;
  wasWatched?: boolean;
  message?: string;
  /**
   * One entry per resolved item, with a definitive watched / not watched verdict.
   */
  checked?: WatchCheck[];
  history: CompactHistoryItem[];
  page?: number;
  hasMore: boolean;
};

type Candidate = {
  type: "movie" | "show";
  traktId: number;
  title: string;
  year?: number;
};

type CandidateSelection = {
  candidates: Candidate[];
  /**
   * Years that do exist for the requested title, filled in only when the caller asked for a
   * year that matched nothing. Lets the caller report the mismatch instead of guessing.
   */
  missedYears: number[];
};

function uniqueYears(candidates: Candidate[]): number[] {
  const years = candidates.map((candidate) => candidate.year).filter((year): year is number => year !== undefined);
  return [...new Set(years)].sort((a, b) => a - b);
}

/**
 * Keep the results worth checking: exact title matches when available,
 * otherwise the two best-ranked results.
 */
function pickCandidates(candidates: Candidate[], query: string, year?: number): CandidateSelection {
  const normalizedQuery = normalizeTitle(query);
  let pool = candidates;

  if (year !== undefined) {
    const sameYear = pool.filter((candidate) => candidate.year === year);
    // Falling back to another release here would hand back an "exhaustive" verdict about a
    // different film, so report the mismatch and let the caller disambiguate instead.
    if (sameYear.length === 0) {
      return { candidates: [], missedYears: uniqueYears(pool) };
    }
    pool = sameYear;
  }

  const exact = pool.filter((candidate) => normalizeTitle(candidate.title) === normalizedQuery);
  if (exact.length > 0) return { candidates: exact.slice(0, 3), missedYears: [] };

  return { candidates: pool.slice(0, 2), missedYears: [] };
}

async function resolveCandidates(
  query: string,
  year: number | undefined,
  type: "movies" | "shows" | "all",
): Promise<CandidateSelection> {
  const resolved: Candidate[] = [];
  const missed = new Set<number>();

  if (type === "movies" || type === "all") {
    const found = await searchMovieCandidates(query);
    const selection = pickCandidates(
      found.map((item) => ({ type: "movie" as const, ...item })),
      query,
      year,
    );
    resolved.push(...selection.candidates);
    selection.missedYears.forEach((value) => missed.add(value));
  }

  if (type === "shows" || type === "all") {
    const found = await searchShowCandidates(query);
    const selection = pickCandidates(
      found.map((item) => ({ type: "show" as const, ...item })),
      query,
      year,
    );
    resolved.push(...selection.candidates);
    selection.missedYears.forEach((value) => missed.add(value));
  }

  return { candidates: resolved, missedYears: [...missed].sort((a, b) => a - b) };
}

/**
 * Query the complete watch history of one specific item.
 * Trakt returns an empty array when the ID is valid but was never watched,
 * which makes a negative result definitive.
 */
async function checkCandidate(candidate: Candidate): Promise<{ check: WatchCheck; events: CompactHistoryItem[] }> {
  if (candidate.type === "movie") {
    const res = await executeToolCall(
      (signal) =>
        toolTraktClient.movies.getMovieHistoryForItem({
          params: { id: candidate.traktId },
          query: { page: 1, limit: 20, extended: "full" },
          fetchOptions: { signal },
        }),
      `Failed to look up watch history for "${candidate.title}"`,
    );

    const paginated = withPagination(res);
    const events = paginated.data.map(toCompactMovieHistory);
    const plays = paginated.pagination["x-pagination-item-count"] || events.length;
    const timestamps = events.map((event) => event.watchedAt).filter((value): value is string => Boolean(value));

    return {
      check: {
        type: "movie",
        title: candidate.title,
        year: candidate.year,
        traktId: candidate.traktId,
        watched: plays > 0,
        plays,
        lastWatchedAt: timestamps[0],
        // Only the first page is loaded, so the oldest event here is the true first watch
        // only when every play fits on it.
        firstWatchedAt: plays <= events.length ? timestamps[timestamps.length - 1] : undefined,
      },
      events,
    };
  }

  const res = await executeToolCall(
    (signal) =>
      toolTraktClient.shows.getShowHistoryForItem({
        params: { id: candidate.traktId },
        query: { page: 1, limit: 20, extended: "full" },
        fetchOptions: { signal },
      }),
    `Failed to look up watch history for "${candidate.title}"`,
  );

  const paginated = withPagination(res);
  const events = paginated.data.map(toCompactShowHistory);
  const plays = paginated.pagination["x-pagination-item-count"] || events.length;
  const timestamps = events.map((event) => event.watchedAt).filter((value): value is string => Boolean(value));

  return {
    check: {
      type: "show",
      title: candidate.title,
      year: candidate.year,
      traktId: candidate.traktId,
      watched: plays > 0,
      plays,
      lastWatchedAt: timestamps[0],
      firstWatchedAt: plays <= events.length ? timestamps[timestamps.length - 1] : undefined,
    },
    events,
  };
}

function sortNewestFirst(items: CompactHistoryItem[]): CompactHistoryItem[] {
  return items.sort((a, b) => {
    const timeA = a.watchedAt ? new Date(a.watchedAt).getTime() : 0;
    const timeB = b.watchedAt ? new Date(b.watchedAt).getTime() : 0;
    return timeB - timeA;
  });
}

/**
 * Check whether (and when) a movie or show was watched, or browse your recent Trakt watch history.
 * Title lookups scan the COMPLETE history for the resolved item, never just the recent entries,
 * so "not watched" answers are reliable.
 */
export default async function tool(input: Input): Promise<Output> {
  const { type = "all", query, year, traktId, page = 1, limit = 20 } = input;
  const safeLimit = Math.min(Math.max(limit, 1), 50);

  // Lookup mode: exhaustive per-item history check
  if (query || traktId !== undefined) {
    let candidates: Candidate[] = [];
    let missedYears: number[] = [];

    if (traktId !== undefined) {
      if (type === "movies" || type === "all") {
        candidates.push({ type: "movie", traktId, title: query ?? `Movie ${traktId}`, year });
      }
      if (type === "shows" || type === "all") {
        candidates.push({ type: "show", traktId, title: query ?? `Show ${traktId}`, year });
      }
    } else if (query) {
      const selection = await resolveCandidates(query, year, type);
      candidates = selection.candidates;
      missedYears = selection.missedYears;
    }

    const target = query ? `"${query}"` : `Trakt ID ${traktId}`;

    if (candidates.length === 0 && year !== undefined && missedYears.length > 0) {
      return {
        mode: "lookup",
        exhaustive: false,
        found: false,
        message:
          `${target} has no ${year} release on Trakt. Known year(s) for that title: ${missedYears.join(", ")}. ` +
          `Ask the user which release they mean, or call again without a year. Do not report a watched or ` +
          `not-watched verdict, because none of the releases above was checked.`,
        checked: [],
        history: [],
        hasMore: false,
      };
    }

    if (candidates.length === 0) {
      return {
        mode: "lookup",
        exhaustive: true,
        found: false,
        wasWatched: false,
        message: `${target} could not be found on Trakt, so it cannot be in your watch history.`,
        checked: [],
        history: [],
        hasMore: false,
      };
    }

    const results = await Promise.all(candidates.map(checkCandidate));
    // When looking up by bare traktId the same ID is probed as movie and show; keep only real hits.
    const meaningful =
      traktId !== undefined && results.some((result) => result.check.watched)
        ? results.filter((result) => result.check.watched)
        : results;

    const checked = meaningful.map((result) => result.check);
    const events = sortNewestFirst(meaningful.flatMap((result) => result.events));
    const watchedItems = checked.filter((item) => item.watched);
    const wasWatched = watchedItems.length > 0;

    const message = wasWatched
      ? watchedItems
          .map(
            (item) =>
              `"${item.title}"${item.year ? ` (${item.year})` : ""} was watched: ${item.plays} recorded play(s)${
                item.lastWatchedAt ? `, most recently on ${item.lastWatchedAt}` : ""
              }.`,
          )
          .join(" ")
      : `Confirmed: no watch event exists for ${target} (checked the complete history of ${checked
          .map((item) => `"${item.title}"${item.year ? ` (${item.year})` : ""}`)
          .join(", ")}). This result is exhaustive, do not assume otherwise.`;

    return {
      mode: "lookup",
      exhaustive: true,
      found: wasWatched,
      wasWatched,
      message,
      checked,
      history: events.slice(0, safeLimit),
      hasMore: false,
    };
  }

  // Browse mode: most recent history entries only
  const allItems: CompactHistoryItem[] = [];
  let hasMore = false;

  if (type === "movies") {
    const res = await executeToolCall(
      (signal) =>
        toolTraktClient.movies.getMovieHistory({
          query: { page, limit: safeLimit, extended: "full" },
          fetchOptions: { signal },
        }),
      "Failed to fetch movie history",
    );
    const paginated = withPagination(res);
    allItems.push(...paginated.data.map(toCompactMovieHistory));
    hasMore = page < paginated.pagination["x-pagination-page-count"];
  } else if (type === "shows") {
    const res = await executeToolCall(
      (signal) =>
        toolTraktClient.shows.getShowHistory({
          query: { page, limit: safeLimit, extended: "full" },
          fetchOptions: { signal },
        }),
      "Failed to fetch show history",
    );
    const paginated = withPagination(res);
    allItems.push(...paginated.data.map(toCompactShowHistory));
    hasMore = page < paginated.pagination["x-pagination-page-count"];
  } else {
    const [moviesRes, showsRes] = await Promise.all([
      executeToolCall(
        (signal) =>
          toolTraktClient.movies.getMovieHistory({
            query: { page, limit: safeLimit, extended: "full" },
            fetchOptions: { signal },
          }),
        "Failed to fetch movie history",
      ),
      executeToolCall(
        (signal) =>
          toolTraktClient.shows.getShowHistory({
            query: { page, limit: safeLimit, extended: "full" },
            fetchOptions: { signal },
          }),
        "Failed to fetch show history",
      ),
    ]);

    const paginatedMovies = withPagination(moviesRes);
    const paginatedShows = withPagination(showsRes);

    allItems.push(...paginatedMovies.data.map(toCompactMovieHistory), ...paginatedShows.data.map(toCompactShowHistory));
    sortNewestFirst(allItems);

    hasMore =
      page < paginatedMovies.pagination["x-pagination-page-count"] ||
      page < paginatedShows.pagination["x-pagination-page-count"];
  }

  return {
    mode: "browse",
    exhaustive: false,
    message:
      "These are only the most recent history entries. Never conclude that a title was not watched from this list; use the `query` parameter for a definitive check.",
    history: allItems.slice(0, safeLimit),
    page,
    hasMore,
  };
}
