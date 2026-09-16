import { withPagination } from "../lib/schema";
import { CompactMovie, CompactShow, toCompactMovie, toCompactShow } from "./compact-media";
import { identifyTraktIdKinds, normalizeTitle } from "./resolve-media";
import { executeToolCall, toolTraktClient } from "./tool-client";

type Input = {
  /**
   * Filter the watchlist by media type: "movies", "shows", or "all".
   * Defaults to "all".
   */
  type?: "movies" | "shows" | "all";
  /**
   * Search for a specific title or keyword directly within your watchlist.
   * ALWAYS use this when checking if a movie or TV show is in the watchlist (e.g. "is DTF in my watchlist?").
   * The scan is local (it pages through the watchlist and filters here), not a server-side
   * title search. A negative is definitive only when `exhaustive` is true. Do NOT paginate
   * the listing path to find a title; use this parameter instead.
   */
  query?: string;
  /**
   * Optional Trakt ID to check if a specific item is in the watchlist.
   * Movie and show IDs overlap: pass `type` ("movies" or "shows") with this field.
   */
  traktId?: number;
  /**
   * The page number for paginated results (when listing items). Defaults to 1.
   */
  page?: number;
  /**
   * Number of items to return per page (default: 30, max: 100).
   */
  limit?: number;
};

type Output = {
  /**
   * Set when searching for a specific item (via query or traktId).
   * True only for an entry whose title matches the query outright, or for the requested
   * `traktId`. Entries that merely contain the query (a sequel, a spin-off) are reported in
   * `matchedMovies` / `matchedShows` without making this true.
   */
  found?: boolean;
  inWatchlist?: boolean;
  /**
   * True when every watchlist entry was inspected, making a negative answer definitive.
   */
  exhaustive?: boolean;
  message?: string;
  matchedMovies?: CompactMovie[];
  matchedShows?: CompactShow[];
  /**
   * List of movies (when listing watchlist).
   */
  movies?: CompactMovie[];
  /**
   * List of TV shows (when listing watchlist).
   */
  shows?: CompactShow[];
  /**
   * Current page returned.
   */
  page?: number;
  /**
   * Total number of items in watchlist for movies/shows if available.
   */
  totalMovies?: number;
  totalShows?: number;
  hasMore: boolean;
};

async function fetchAllPagesForQuery<
  T extends { movie?: { title: string; ids: { trakt: number } }; show?: { title: string; ids: { trakt: number } } },
>(
  fetcher: (
    page: number,
    limit: number,
    signal: AbortSignal,
  ) => Promise<{ status: number; body: T[]; headers: Headers }>,
  matcher: (item: T) => boolean,
  maxPages = 20,
  pageSize = 100,
): Promise<{ matches: T[]; totalCount: number; scanned: number; exhaustive: boolean }> {
  const matches: T[] = [];
  let totalCount = 0;
  let scanned = 0;
  let exhaustive = false;

  for (let p = 1; p <= maxPages; p++) {
    const res = await executeToolCall((signal) => fetcher(p, pageSize, signal), "Failed to search watchlist");
    const paginated = withPagination(res);
    totalCount = paginated.pagination["x-pagination-item-count"] || totalCount;
    scanned += paginated.data.length;

    for (const item of paginated.data) {
      if (matcher(item)) {
        matches.push(item);
      }
    }

    if (paginated.data.length < pageSize || p >= paginated.pagination["x-pagination-page-count"]) {
      exhaustive = true;
      break;
    }
  }

  return { matches, totalCount, scanned, exhaustive };
}

/**
 * Get items from your authenticated Trakt watchlist or search for a specific title inside it.
 * - To check if an item is in your watchlist, supply `query` or `traktId` to get an instant answer without paginating.
 * - To view your watchlist, supply `type` and an optional `limit` (default: 30).
 */
export default async function tool(input: Input): Promise<Output> {
  const { type = "all", query, traktId, page = 1, limit = 30 } = input;
  const safeLimit = Math.min(Math.max(limit, 1), 100);

  // Fast path: search for a specific item in the watchlist
  if (query || traktId) {
    let scanMovies = type === "movies" || type === "all";
    let scanShows = type === "shows" || type === "all";

    if (traktId !== undefined && type !== "all") {
      const kinds = await identifyTraktIdKinds(traktId);
      const wanted = type === "movies" ? "movie" : "show";
      if (kinds.length > 0 && !kinds.includes(wanted)) {
        const actual = kinds[0] === "movie" ? "movie" : "show";
        return {
          found: false,
          inWatchlist: false,
          exhaustive: false,
          message:
            `Trakt ID ${traktId} is a ${actual}, not a ${wanted}. ` +
            `Call again with \`type: "${actual === "movie" ? "movies" : "shows"}"\`. Do not answer from this call.`,
          hasMore: false,
        };
      }
    }

    if (traktId !== undefined && type === "all") {
      const kinds = await identifyTraktIdKinds(traktId);
      if (kinds.length === 2) {
        return {
          found: false,
          inWatchlist: false,
          exhaustive: false,
          message:
            `Trakt ID ${traktId} is used by both a movie and a show; those namespaces are not interchangeable. ` +
            `Pass \`type: "movies"\` or \`type: "shows"\` instead of answering from this ID.`,
          hasMore: false,
        };
      }
      if (kinds.length === 0) {
        return {
          found: false,
          inWatchlist: false,
          exhaustive: true,
          message: `Confirmed: Trakt ID ${traktId} does not exist as a movie or a show, so it cannot be in your watchlist.`,
          hasMore: false,
        };
      }
      scanMovies = kinds[0] === "movie";
      scanShows = kinds[0] === "show";
    }

    const normalizedQuery = query ? normalizeTitle(query) : undefined;

    /**
     * Accents cannot be allowed to decide the verdict: comparing raw text makes "Amelie" miss
     * "Amélie" while the reply below still claims every entry was searched. Containment is kept
     * so near misses can be surfaced, but only an outright title match counts as being in the
     * watchlist, otherwise "Dune: Part Two" would answer for "Dune".
     */
    const classify = (title: string, id: number): "exact" | "partial" | "none" => {
      if (traktId !== undefined && id === traktId) return "exact";
      if (!normalizedQuery) return "none";

      const normalizedTitle = normalizeTitle(title);
      if (normalizedTitle === normalizedQuery) return "exact";

      return normalizedTitle.includes(normalizedQuery) ? "partial" : "none";
    };

    const matchesFilter = (title: string, id: number) => classify(title, id) !== "none";

    let matchedMovies: CompactMovie[] = [];
    let matchedShows: CompactShow[] = [];
    let totalMovies = 0;
    let totalShows = 0;
    let exhaustive = true;

    if (scanMovies) {
      const result = await fetchAllPagesForQuery(
        (p, l, signal) =>
          toolTraktClient.movies.getWatchlistMovies({
            query: {
              page: p,
              limit: l,
              extended: "full",
              sort_by: "added",
              sort_how: "desc",
            },
            fetchOptions: { signal },
          }),
        (item) => matchesFilter(item.movie.title, item.movie.ids.trakt),
      );
      matchedMovies = result.matches.map(toCompactMovie);
      totalMovies = result.totalCount;
      exhaustive = exhaustive && result.exhaustive;
    }

    if (scanShows) {
      const result = await fetchAllPagesForQuery(
        (p, l, signal) =>
          toolTraktClient.shows.getWatchlistShows({
            query: {
              page: p,
              limit: l,
              extended: "full",
              sort_by: "added",
              sort_how: "desc",
            },
            fetchOptions: { signal },
          }),
        (item) => matchesFilter(item.show.title, item.show.ids.trakt),
      );
      matchedShows = result.matches.map(toCompactShow);
      totalShows = result.totalCount;
      exhaustive = exhaustive && result.exhaustive;
    }

    const matched = [...matchedMovies, ...matchedShows];
    const exactCount = matched.filter((item) => classify(item.title, item.traktId) === "exact").length;
    const relatedCount = matched.length - exactCount;
    const isFound = exactCount > 0;
    const target = query ?? `Trakt ID ${traktId}`;
    const plural = (count: number) => (count === 1 ? "y" : "ies");

    let message: string;
    if (isFound) {
      message =
        relatedCount > 0
          ? `Found ${exactCount} item(s) titled "${target}" in your watchlist, plus ${relatedCount} related ` +
            `entr${plural(relatedCount)} whose title contains it.`
          : `Found ${exactCount} matching item(s) in your watchlist.`;
    } else if (relatedCount > 0) {
      message =
        `"${target}" itself is not in your watchlist, but ${relatedCount} related entr${plural(relatedCount)} ` +
        `share part of that title: ${matched.map((item) => `"${item.title}"`).join(", ")}. Ask the user whether ` +
        `they meant one of those rather than answering with a flat no.`;
    } else if (exhaustive) {
      message = `Confirmed: "${target}" is not in your watchlist (searched every entry).`;
    } else {
      message = `"${target}" was not found, but the watchlist is too large to scan entirely. This result is NOT definitive.`;
    }

    return {
      found: isFound,
      inWatchlist: isFound,
      exhaustive,
      message,
      matchedMovies: matchedMovies.length > 0 ? matchedMovies : undefined,
      matchedShows: matchedShows.length > 0 ? matchedShows : undefined,
      totalMovies,
      totalShows,
      hasMore: false,
    };
  }

  // Standard path: list items with larger default limit and sorted descending (newest first)
  if (type === "movies") {
    const response = await executeToolCall(
      (signal) =>
        toolTraktClient.movies.getWatchlistMovies({
          query: {
            page,
            limit: safeLimit,
            extended: "full",
            sort_by: "added",
            sort_how: "desc",
          },
          fetchOptions: { signal },
        }),
      "Failed to fetch watchlist movies",
    );
    const paginated = withPagination(response);
    return {
      movies: paginated.data.map(toCompactMovie),
      page,
      totalMovies: paginated.pagination["x-pagination-item-count"],
      hasMore: paginated.pagination["x-pagination-page"] < paginated.pagination["x-pagination-page-count"],
      exhaustive: false,
    };
  }

  if (type === "shows") {
    const response = await executeToolCall(
      (signal) =>
        toolTraktClient.shows.getWatchlistShows({
          query: {
            page,
            limit: safeLimit,
            extended: "full",
            sort_by: "added",
            sort_how: "desc",
          },
          fetchOptions: { signal },
        }),
      "Failed to fetch watchlist shows",
    );
    const paginated = withPagination(response);
    return {
      shows: paginated.data.map(toCompactShow),
      page,
      totalShows: paginated.pagination["x-pagination-item-count"],
      hasMore: paginated.pagination["x-pagination-page"] < paginated.pagination["x-pagination-page-count"],
      exhaustive: false,
    };
  }

  // "all" - fetch movies and shows in parallel with safeLimit
  const [moviesResponse, showsResponse] = await Promise.all([
    executeToolCall(
      (signal) =>
        toolTraktClient.movies.getWatchlistMovies({
          query: {
            page,
            limit: safeLimit,
            extended: "full",
            sort_by: "added",
            sort_how: "desc",
          },
          fetchOptions: { signal },
        }),
      "Failed to fetch watchlist movies",
    ),
    executeToolCall(
      (signal) =>
        toolTraktClient.shows.getWatchlistShows({
          query: {
            page,
            limit: safeLimit,
            extended: "full",
            sort_by: "added",
            sort_how: "desc",
          },
          fetchOptions: { signal },
        }),
      "Failed to fetch watchlist shows",
    ),
  ]);

  const paginatedMovies = withPagination(moviesResponse);
  const paginatedShows = withPagination(showsResponse);

  const moviesHasMore =
    paginatedMovies.pagination["x-pagination-page"] < paginatedMovies.pagination["x-pagination-page-count"];
  const showsHasMore =
    paginatedShows.pagination["x-pagination-page"] < paginatedShows.pagination["x-pagination-page-count"];

  return {
    movies: paginatedMovies.data.map(toCompactMovie),
    shows: paginatedShows.data.map(toCompactShow),
    page,
    totalMovies: paginatedMovies.pagination["x-pagination-item-count"],
    totalShows: paginatedShows.pagination["x-pagination-item-count"],
    hasMore: moviesHasMore || showsHasMore,
    exhaustive: false,
  };
}
