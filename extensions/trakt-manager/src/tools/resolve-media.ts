import { TraktIdLookupEntry } from "../lib/schema";
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

export type MediaKind = "movie" | "show" | "season" | "episode";

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

  if (kind === "season" && entry.season) {
    const showTitle = entry.show?.title ?? `Show ${traktId}`;
    const number = entry.season.number;
    return number === undefined ? `${showTitle}, a season` : `${showTitle}, season ${number}`;
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
