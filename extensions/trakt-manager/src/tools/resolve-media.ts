import { executeToolCall, toolTraktClient } from "./tool-client";

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

export type TitleSearch = {
  /**
   * Every release reachable for the query, the exact-title ones first.
   */
  candidates: ResolvedMedia[];
  /**
   * True when the title-first search filled a whole page, meaning further releases sharing
   * the title exist out of reach. A negative conclusion drawn from a truncated set is a
   * guess, so callers must stop describing it as complete.
   */
  truncated: boolean;
};

function mergeById(...groups: ResolvedMedia[][]): ResolvedMedia[] {
  const byId = new Map<number, ResolvedMedia>();

  for (const group of groups) {
    for (const candidate of group) {
      if (!byId.has(candidate.traktId)) byId.set(candidate.traktId, candidate);
    }
  }

  return [...byId.values()];
}

export function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Trakt orders search results by popularity, so a recent or obscure entry can rank
 * below better known homonyms. Prefer an exact title match, then a matching year,
 * before falling back to Trakt's own ranking.
 */
export function pickBestMatch(candidates: ResolvedMedia[], query: string, year?: number): ResolvedMatch | undefined {
  if (candidates.length === 0) return undefined;

  const normalizedQuery = normalizeTitle(query);
  const isExactTitle = (candidate: ResolvedMedia) => normalizeTitle(candidate.title) === normalizedQuery;
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
export async function searchMovieCandidates(query: string, limit = SEARCH_RESULT_CAP): Promise<TitleSearch> {
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

  const toMedia = (item: (typeof exact.body)[number]) => ({
    traktId: item.movie.ids.trakt,
    title: item.movie.title,
    year: item.movie.year,
  });

  return {
    candidates: mergeById(exact.body.map(toMedia), broad.body.map(toMedia)),
    truncated: exact.body.length >= limit,
  };
}

export async function searchShowCandidates(query: string, limit = SEARCH_RESULT_CAP): Promise<TitleSearch> {
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

  const toMedia = (item: (typeof exact.body)[number]) => ({
    traktId: item.show.ids.trakt,
    title: item.show.title,
    year: item.show.year,
  });

  return {
    candidates: mergeById(exact.body.map(toMedia), broad.body.map(toMedia)),
    truncated: exact.body.length >= limit,
  };
}

/**
 * Resolve a show title to a single best-matching Trakt entry.
 * A wrong year degrades into a looser match flagged with `matchedYear: false`
 * rather than a "not found" error.
 */
export async function resolveShow(title: string, year?: number): Promise<ResolvedMatch | undefined> {
  const { candidates } = await searchShowCandidates(title);
  return pickBestMatch(candidates, title, year);
}

export async function resolveMovie(title: string, year?: number): Promise<ResolvedMatch | undefined> {
  const { candidates } = await searchMovieCandidates(title);
  return pickBestMatch(candidates, title, year);
}
