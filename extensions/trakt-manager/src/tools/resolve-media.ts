import { TraktIdLookupEntry, TraktMovieListItem, TraktShowListItem } from "../lib/schema";
import { executeToolCall, executeToolCallAllowingNotFound, toolTraktClient } from "./tool-client";
import { normalizeTitle, resolveLookupQuery } from "./title-text";

export { classifyTitleMatch, describeYearFilter, isMatchableTitle, normalizeTitle } from "./title-text";
export type { TitleMatchKind } from "./title-text";

export type ResolvedMedia = {
  traktId: number;
  title: string;
  year?: number;
};

export type ResolvedMatch = ResolvedMedia & {
  /**
   * False when a year was requested but no candidate had it, meaning the returned
   * entry is a fallback rather than the exact item the caller asked for.
   */
  matchedYear: boolean;
  /**
   * False when the returned title is not an exact match for the query. A requested year can
   * only exist under a different title (asking for "Dune" 2026 resolves to "Dune: Part Three"),
   * so callers must surface this instead of answering as if it were the requested title.
   */
  titleMatched: boolean;
};

/**
 * Trakt serves every search from a single page of at most 50 results: a larger `limit` is
 * clamped, `page-count` always reports 1, and page 2 repeats page 1. Nothing beyond this
 * many results is reachable for a given query, so a response holding exactly this many is
 * truncated and callers must not read it as the complete set. Trakt also ignores the
 * `years` filter here, which is why years are filtered on our side.
 */
export const SEARCH_RESULT_CAP = 50;

/**
 * Completeness of a merged title search. The two flags answer different questions and must
 * not be collapsed: a full relevance page can hide a year under a related title, while the
 * exact-title set is only incomplete when the exact search itself hits its cap.
 */
type SearchCompleteness = {
  /**
   * True when either page is full. A requested year can live under a related title that
   * ranked outside the relevance window, so year filters must not treat an empty result as
   * proof that the year does not exist.
   */
  truncated: boolean;
  /**
   * True when the exact-title search filled a page. Further releases sharing that title
   * then exist out of reach. A full relevance page alone does not imply this — Dune's four
   * exact matches all come back from `/exact` even though relevance returns 50.
   */
  exactTruncated: boolean;
};

export type TitleSearch = SearchCompleteness & {
  /**
   * Every release reachable for the query, the exact-title ones first.
   */
  candidates: ResolvedMedia[];
};

/**
 * The same reachable releases as `TitleSearch`, kept as Trakt returned them for callers that
 * need more than an identifier, a title and a year.
 */
export type TitleSearchResults<T> = SearchCompleteness & { items: T[] };

function mergeById<T>(idOf: (item: T) => number, ...groups: T[][]): T[] {
  const byId = new Map<number, T>();

  for (const group of groups) {
    for (const item of group) {
      const id = idOf(item);
      if (!byId.has(id)) byId.set(id, item);
    }
  }

  return [...byId.values()];
}

/**
 * Trakt orders search results by popularity, so a recent or obscure entry can rank
 * below better known homonyms. Prefer an exact title match, then a matching year,
 * before falling back to Trakt's own ranking.
 */
export function pickBestMatch(candidates: ResolvedMedia[], query: string, year?: number): ResolvedMatch | undefined {
  if (candidates.length === 0) return undefined;

  const normalizedQuery = normalizeTitle(query);
  const comparable = normalizedQuery.length > 0;
  const isExactTitle = (candidate: ResolvedMedia) => comparable && normalizeTitle(candidate.title) === normalizedQuery;
  const exact = candidates.filter(isExactTitle);
  const pool = exact.length > 0 ? exact : candidates;

  if (year !== undefined) {
    const sameYear = pool.find((candidate) => candidate.year === year);
    if (sameYear) return { ...sameYear, matchedYear: true, titleMatched: isExactTitle(sameYear) };

    // The year exists, but only under another title. Returning it is still the best guess,
    // provided the caller is told the title drifted.
    const sameYearAnywhere = candidates.find((candidate) => candidate.year === year);
    if (sameYearAnywhere) {
      return { ...sameYearAnywhere, matchedYear: true, titleMatched: isExactTitle(sameYearAnywhere) };
    }
  }

  return { ...pool[0], matchedYear: year === undefined, titleMatched: isExactTitle(pool[0]) };
}

/**
 * Collect every Trakt release reachable for a title.
 *
 * Relevance ranking alone hides same-title releases behind popular homonyms: searching
 * "Wild" surfaces 1 of its 17 exact matches, and "Dune" misses the 1989 release entirely.
 * The title-first search covers those, but is not a superset either — it drops a "Hamlet"
 * release that relevance ranking finds. Trakt's guidance is therefore to query both and
 * de-duplicate by Trakt ID, which is what its own site search does.
 */
export async function searchMovieResults(
  query: string,
  limit = SEARCH_RESULT_CAP,
): Promise<TitleSearchResults<TraktMovieListItem>> {
  const [exact, broad] = await Promise.all([
    executeToolCall(
      (signal) =>
        toolTraktClient.movies.searchMoviesExact({
          query: { query, page: 1, limit, extended: "full" },
          fetchOptions: { signal },
        }),
      `Failed to search for movie "${query}"`,
    ),
    executeToolCall(
      (signal) =>
        toolTraktClient.movies.searchMovies({
          query: { query, fields: "title,aliases", page: 1, limit, extended: "full" },
          fetchOptions: { signal },
        }),
      `Failed to search for movie "${query}"`,
    ),
  ]);

  return {
    items: mergeById((item) => item.movie.ids.trakt, exact.body, broad.body),
    truncated: exact.body.length >= limit || broad.body.length >= limit,
    exactTruncated: exact.body.length >= limit,
  };
}

export async function searchShowResults(
  query: string,
  limit = SEARCH_RESULT_CAP,
): Promise<TitleSearchResults<TraktShowListItem>> {
  const [exact, broad] = await Promise.all([
    executeToolCall(
      (signal) =>
        toolTraktClient.shows.searchShowsExact({
          query: { query, page: 1, limit, extended: "full" },
          fetchOptions: { signal },
        }),
      `Failed to search for TV show "${query}"`,
    ),
    executeToolCall(
      (signal) =>
        toolTraktClient.shows.searchShows({
          query: { query, fields: "title,aliases", page: 1, limit, extended: "full" },
          fetchOptions: { signal },
        }),
      `Failed to search for TV show "${query}"`,
    ),
  ]);

  return {
    items: mergeById((item) => item.show.ids.trakt, exact.body, broad.body),
    truncated: exact.body.length >= limit || broad.body.length >= limit,
    exactTruncated: exact.body.length >= limit,
  };
}

export async function searchMovieCandidates(query: string, limit = SEARCH_RESULT_CAP): Promise<TitleSearch> {
  const { items, truncated, exactTruncated } = await searchMovieResults(query, limit);

  return {
    candidates: items.map((item) => ({
      traktId: item.movie.ids.trakt,
      title: item.movie.title,
      year: item.movie.year,
    })),
    truncated,
    exactTruncated,
  };
}

export async function searchShowCandidates(query: string, limit = SEARCH_RESULT_CAP): Promise<TitleSearch> {
  const { items, truncated, exactTruncated } = await searchShowResults(query, limit);

  return {
    candidates: items.map((item) => ({
      traktId: item.show.ids.trakt,
      title: item.show.title,
      year: item.show.year,
    })),
    truncated,
    exactTruncated,
  };
}

/**
 * Resolve a show title to a single best-matching Trakt entry.
 * A wrong year degrades into a looser match flagged with `matchedYear: false`
 * rather than a "not found" error.
 */
export async function resolveShow(title: string, year?: number): Promise<ResolvedMatch | undefined> {
  const lookup = resolveLookupQuery(title, year);
  const { candidates } = await searchShowCandidates(lookup.text ?? title);
  const rawExact = candidates.some((candidate) => normalizeTitle(candidate.title) === normalizeTitle(title));
  return pickBestMatch(candidates, rawExact ? title : (lookup.text ?? title), rawExact ? year : lookup.year);
}

export async function resolveMovie(title: string, year?: number): Promise<ResolvedMatch | undefined> {
  const lookup = resolveLookupQuery(title, year);
  const { candidates } = await searchMovieCandidates(lookup.text ?? title);
  const rawExact = candidates.some((candidate) => normalizeTitle(candidate.title) === normalizeTitle(title));
  return pickBestMatch(candidates, rawExact ? title : (lookup.text ?? title), rawExact ? year : lookup.year);
}

export type MediaKind = "movie" | "show" | "episode";

function withYear(title: string, year?: number): string {
  return year ? `${title} (${year})` : title;
}

function episodeCode(season?: number, number?: number): string | undefined {
  if (season === undefined || number === undefined) return undefined;
  return `S${String(season).padStart(2, "0")}E${String(number).padStart(2, "0")}`;
}

function buildLabel(kind: MediaKind, traktId: number, entry: TraktIdLookupEntry): string {
  if (kind === "movie" && entry.movie) {
    return withYear(entry.movie.title ?? `Movie ${traktId}`, entry.movie.year);
  }

  if (kind === "show" && entry.show) {
    return withYear(entry.show.title ?? `Show ${traktId}`, entry.show.year);
  }

  if (kind === "episode" && entry.episode) {
    const showTitle = entry.show?.title;
    const code = episodeCode(entry.episode.season, entry.episode.number);
    const parts = [showTitle, code].filter(Boolean).join(" ");
    const episodeTitle = entry.episode.title;

    if (parts && episodeTitle) return `${parts} "${episodeTitle}"`;
    if (parts) return parts;
    return episodeTitle ?? `Episode ${traktId}`;
  }

  throw new Error(`Trakt ID ${traktId} is not a ${kind}. Re-resolve the item before writing.`);
}

/**
 * Describe the item a Trakt ID actually points at, using Trakt as the source of truth.
 *
 * Write tools receive an ID and a separate human-readable label from the caller, and nothing
 * ties the two together. Confirmations must therefore describe the ID that is about to be
 * written rather than the caller's label, otherwise a user can approve "Dune (2021)" while a
 * different item gets modified. A failed lookup propagates and blocks the write, which is the
 * safe outcome.
 *
 * `/search/trakt/:id` documents `movie`, `show`, `episode`, `person` and `list`.
 * `type=season` is ignored, so seasons are never resolved here.
 */
export async function describeMedia(kind: MediaKind, traktId: number): Promise<string> {
  const res = await executeToolCall(
    (signal) =>
      toolTraktClient.search.lookupById({
        params: { id: traktId },
        query: { type: kind },
        fetchOptions: { signal },
      }),
    `Failed to look up the Trakt ${kind} with ID ${traktId}`,
  );

  const match = res.body.find((entry) => entry.type === kind) ?? res.body[0];
  if (!match) {
    throw new Error(`No Trakt ${kind} exists with ID ${traktId}. Re-resolve the title before writing.`);
  }

  return buildLabel(kind, traktId, match);
}

/**
 * Describe several IDs of the same kind, capped so a large batch cannot fan out into an
 * unbounded number of lookups. Returns the labels resolved plus how many were left out.
 */
export async function describeMediaBatch(
  kind: MediaKind,
  traktIds: number[],
  cap = 5,
): Promise<{ labels: string[]; remaining: number }> {
  const head = traktIds.slice(0, cap);
  const labels = await Promise.all(head.map((traktId) => describeMedia(kind, traktId)));

  return { labels, remaining: Math.max(traktIds.length - head.length, 0) };
}

/**
 * Explain an empty year-filtered search.
 *
 * "This title has no release that year" and "that release is out of Trakt's reach" look
 * identical once the filter has run, yet only the first is a fact. Saying which one applies
 * keeps the caller from reporting a reachable release as non-existent.
 */
export type TraktIdKind = "movie" | "show";

/**
 * Trakt movie IDs and show IDs share a numeric space but are not interchangeable.
 * 287071 is Dune (2021) and also a different show. A 404 from one history namespace
 * means the ID does not exist there; a 200 (even an empty history) means it does.
 */
export async function identifyTraktIdKinds(id: number): Promise<TraktIdKind[]> {
  const query = { page: 1, limit: 1 } as const;
  const [movie, show] = await Promise.all([
    executeToolCallAllowingNotFound(
      (signal) =>
        toolTraktClient.movies.getMovieHistoryForItem({
          params: { id },
          query,
          fetchOptions: { signal },
        }),
      `Failed to identify movie ID ${id}`,
    ),
    executeToolCallAllowingNotFound(
      (signal) =>
        toolTraktClient.shows.getShowHistoryForItem({
          params: { id },
          query,
          fetchOptions: { signal },
        }),
      `Failed to identify show ID ${id}`,
    ),
  ]);

  const kinds: TraktIdKind[] = [];
  if (movie) kinds.push("movie");
  if (show) kinds.push("show");
  return kinds;
}
