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
};

/**
 * Trakt's text search never returns more than 50 results, on a single page, and it
 * ignores the `years` filter that works on its other endpoints. Asking for the full
 * 50 therefore retrieves every reachable result, which makes filtering by year on
 * our side exhaustive instead of a guess over the most popular handful.
 */
export const SEARCH_RESULT_CAP = 50;

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
  const exact = candidates.filter((candidate) => normalizeTitle(candidate.title) === normalizedQuery);
  const pool = exact.length > 0 ? exact : candidates;

  if (year !== undefined) {
    const sameYear = pool.find((candidate) => candidate.year === year);
    if (sameYear) return { ...sameYear, matchedYear: true };

    const sameYearAnywhere = candidates.find((candidate) => candidate.year === year);
    if (sameYearAnywhere) return { ...sameYearAnywhere, matchedYear: true };
  }

  return { ...pool[0], matchedYear: year === undefined };
}

export async function searchMovieCandidates(query: string, limit = SEARCH_RESULT_CAP): Promise<ResolvedMedia[]> {
  const res = await executeToolCall(
    (signal) =>
      toolTraktClient.movies.searchMovies({
        query: { query, fields: "title,aliases", page: 1, limit, extended: "full" },
        fetchOptions: { signal },
      }),
    `Failed to search for movie "${query}"`,
  );

  return res.body.map((item) => ({
    traktId: item.movie.ids.trakt,
    title: item.movie.title,
    year: item.movie.year,
  }));
}

export async function searchShowCandidates(query: string, limit = SEARCH_RESULT_CAP): Promise<ResolvedMedia[]> {
  const res = await executeToolCall(
    (signal) =>
      toolTraktClient.shows.searchShows({
        query: { query, fields: "title,aliases", page: 1, limit, extended: "full" },
        fetchOptions: { signal },
      }),
    `Failed to search for TV show "${query}"`,
  );

  return res.body.map((item) => ({
    traktId: item.show.ids.trakt,
    title: item.show.title,
    year: item.show.year,
  }));
}

/**
 * Resolve a show title to a single best-matching Trakt entry.
 * A wrong year degrades into a looser match flagged with `matchedYear: false`
 * rather than a "not found" error.
 */
export async function resolveShow(title: string, year?: number): Promise<ResolvedMatch | undefined> {
  return pickBestMatch(await searchShowCandidates(title), title, year);
}

export async function resolveMovie(title: string, year?: number): Promise<ResolvedMatch | undefined> {
  return pickBestMatch(await searchMovieCandidates(title), title, year);
}
