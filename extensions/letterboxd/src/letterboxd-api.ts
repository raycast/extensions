import { Cache } from "@raycast/api";
import {
  extractMovieDetails,
  getFullURL,
  getSearchCursor,
  normalizeSearchResponse,
  type LetterboxdSearchResponse,
} from "./movie-data";
import type { Movie, MovieDetails } from "./types";
import { fetchJsonWithRetry, fetchWithRetry } from "./utils";

const cache = new Cache({ namespace: "movie-details" });

interface CacheEntry<T> {
  lastSynced: number;
  data: T;
}

const CACHE_EXPIRY_TIME = 1000 * 60 * 60 * 24;
const LETTERBOXD_API_URL_BASE = "https://api.letterboxd.com/api/v0";

function getFromCache<T>(key: string): T | undefined {
  const response = cache.get(key);
  if (!response) return undefined;

  try {
    const entry = JSON.parse(response) as Partial<CacheEntry<T>>;
    if (
      typeof entry.lastSynced !== "number" ||
      entry.data === undefined ||
      Date.now() >= entry.lastSynced + CACHE_EXPIRY_TIME
    ) {
      cache.remove(key);
      return undefined;
    }
    return entry.data;
  } catch {
    cache.remove(key);
    return undefined;
  }
}

function addToCache<T>(key: string, value: T) {
  const entry: CacheEntry<T> = { lastSynced: Date.now(), data: value };
  cache.set(key, JSON.stringify(entry));
}

function getSearchUrl(query: string, cursor?: string) {
  const url = new URL(`${LETTERBOXD_API_URL_BASE}/search`);
  url.searchParams.set("input", query);
  url.searchParams.set("searchMethod", "Autocomplete");
  url.searchParams.set("include", "FilmSearchItem");
  url.searchParams.set("perPage", "20");
  if (cursor) url.searchParams.set("cursor", cursor);
  return url.toString();
}

export const fetchMoviesByTitle = (title: string) =>
  async function fetchPage(options: { cursor?: string }): Promise<{
    data: Movie[];
    hasMore: boolean;
    cursor?: string;
  }> {
    const query = title.trim();
    if (!query) return { data: [], hasMore: false };

    const response = await fetchJsonWithRetry<LetterboxdSearchResponse>(
      getSearchUrl(query, options.cursor),
    );
    const nextCursor = getSearchCursor(response.next);

    return {
      data: normalizeSearchResponse(response),
      hasMore: nextCursor !== undefined,
      cursor: nextCursor,
    };
  };

export async function fetchMovieDetails(
  urlPath: string,
): Promise<MovieDetails> {
  const cacheKey = new URL(getFullURL(urlPath)).pathname;
  const cachedResponse = getFromCache<MovieDetails>(cacheKey);
  if (cachedResponse) return cachedResponse;

  const url = getFullURL(urlPath);
  const response = await fetchWithRetry(url);
  const data = extractMovieDetails(response, url, cacheKey);
  addToCache(cacheKey, data);
  return data;
}

export { getFullURL };
