import { withPagination } from "../lib/schema";
import { CompactPausedMovie, CompactUpNextItem, toCompactPausedMovie, toCompactUpNext } from "./compact-media";
import { mergeContinueWatchingHalves } from "./continue-watching";
import { confirmHasMore } from "./page-lookahead";
import { executeToolCall, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * What to include: "shows" (next episode of each show in progress), "movies" (movies paused
   * mid-playback), or "all" for both, like Trakt's Continue Watching. Defaults to "all".
   */
  type?: "all" | "shows" | "movies";
  /**
   * The page number for paginated results. Defaults to 1. Applies to shows and movies separately.
   */
  page?: number;
  /**
   * Number of items to retrieve per media type (default: 20, max: 50).
   */
  limit?: number;
};

type Output = {
  /** Shows in progress with their next episode. Empty when `type` is "movies". */
  data: CompactUpNextItem[];
  /** Movies paused mid-playback. Empty when `type` is "shows". */
  movies: CompactPausedMovie[];
  page: number;
  /** True when shows or movies have another page. */
  hasMore: boolean;
  /**
   * Always false: this is a browse page, not a lookup. Absence from it does not mean
   * a show has no next episode or a movie was never started.
   */
  exhaustive: false;
  /** Set when one half of an "all" request failed: the other half is still returned. */
  warning?: string;
};

const requestShows = (page: number, limit: number) =>
  executeToolCall(
    (signal) =>
      toolTraktClient.shows.getUpNextNitroShows({
        query: { page, limit, intent: "continue" },
        fetchOptions: { signal },
      }),
    "Failed to fetch up-next shows",
  );

const requestPausedMovies = (page: number, limit: number) =>
  executeToolCall(
    (signal) =>
      toolTraktClient.movies.getPlaybackMovies({
        query: { page, limit, extended: "full" },
        fetchOptions: { signal },
      }),
    "Failed to fetch paused movies",
  );

async function fetchShows(page: number, limit: number) {
  const paginated = withPagination(await requestShows(page, limit));
  const hasMore = await confirmHasMore(paginated.data.length, paginated.pagination, limit, async () => {
    const next = await requestShows(page + 1, limit);
    return Array.isArray(next.body) ? next.body.length : 0;
  });

  return { items: paginated.data.map(toCompactUpNext), hasMore };
}

// Playback is paginated only on request ("Pagination Optional"): `page` and `limit` are always sent,
// and the next page is looked at the same way as for shows rather than trusting a full page.
async function fetchPausedMovies(page: number, limit: number) {
  const paginated = withPagination(await requestPausedMovies(page, limit));
  const hasMore = await confirmHasMore(paginated.data.length, paginated.pagination, limit, async () => {
    const next = await requestPausedMovies(page + 1, limit);
    return Array.isArray(next.body) ? next.body.length : 0;
  });

  return { items: paginated.data.map(toCompactPausedMovie), hasMore };
}

/**
 * Get the user's Continue Watching list on Trakt: the next unwatched episode of each show in progress
 * (season, number, title, first aired date, progress) and the movies paused mid-playback
 * (progress percentage, minutes left, paused date).
 */
export default async function tool(input: Input): Promise<Output> {
  const { type = "all", page = 1, limit = 20 } = input;
  const safeLimit = Math.min(Math.max(limit, 1), 50);

  const none = { items: [], hasMore: false };
  // With "all", one failed half must not hide the other: shows are what most callers ask for.
  const [showsResult, moviesResult] = await Promise.allSettled([
    type === "movies" ? none : fetchShows(page, safeLimit),
    type === "shows" ? none : fetchPausedMovies(page, safeLimit),
  ]);
  const { shows, movies, warning } = mergeContinueWatchingHalves(type, showsResult, moviesResult);

  return {
    data: shows.items,
    movies: movies.items,
    page,
    hasMore: shows.hasMore || movies.hasMore,
    exhaustive: false,
    ...(warning && { warning }),
  };
}
