/**
 * Duden.de API client for scraping word information
 * Based on endpoints from the Python duden project
 */

import { Cache } from "@raycast/api";
import { DudenWord, SearchResult } from "../types/duden";
import { parseWordDetails, parseSearchResults } from "../utils/parser";

const BASE_URL = "https://www.duden.de";
const WORD_URL = `${BASE_URL}/rechtschreibung`;
const SEARCH_URL = `${BASE_URL}/suchen/dudenonline`;
const REQUEST_TIMEOUT = 10000; // 10 seconds
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Use Raycast's built-in cache
const cache = new Cache();

/**
 * Get data from cache if valid
 */
function getFromCache<T>(key: string): T | null {
  const cached = cache.get(key);
  if (!cached) return null;

  try {
    const parsed = JSON.parse(cached);
    // Check if cache is expired
    if (Date.now() - parsed.timestamp > CACHE_TTL) {
      cache.remove(key);
      return null;
    }
    return parsed.data as T;
  } catch {
    return null;
  }
}

/**
 * Store data in cache
 */
function setCache<T>(key: string, data: T): void {
  cache.set(
    key,
    JSON.stringify({
      data,
      timestamp: Date.now(),
    }),
  );
}

/**
 * Make HTTP request with timeout and error handling
 */
async function makeRequest(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Raycast Duden Extension (https://github.com/raycast/extensions)",
      },
    });

    clearTimeout(timeoutId);

    if (response.status === 404) {
      throw new Error("Word not found");
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("Request timeout");
      }
      throw error;
    }
    throw new Error("Unknown error occurred");
  }
}

/**
 * Search for words on Duden.de
 */
export async function searchWords(query: string): Promise<SearchResult[]> {
  if (query.length < 3) {
    return [];
  }

  const cacheKey = `search:${query}`;
  const cached = getFromCache<SearchResult[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const url = `${SEARCH_URL}/${encodeURIComponent(query)}`;
    const html = await makeRequest(url);
    const results = parseSearchResults(html);

    // Limit to 12 results as discussed
    const limitedResults = results.slice(0, 12);

    setCache(cacheKey, limitedResults);
    return limitedResults;
  } catch (error) {
    if (error instanceof Error && error.message === "Word not found") {
      // Return empty array for 404s as discussed
      return [];
    }
    throw error;
  }
}

/**
 * Get detailed word information
 */
export async function getWordDetails(urlname: string): Promise<DudenWord> {
  const cacheKey = `word:${urlname}`;
  const cached = getFromCache<DudenWord>(cacheKey);
  if (cached) {
    return cached;
  }

  const url = `${WORD_URL}/${encodeURIComponent(urlname)}`;
  const html = await makeRequest(url);
  const word = parseWordDetails(html);

  if (!word) {
    throw new Error("Failed to parse word details");
  }

  setCache(cacheKey, word);
  return word;
}

/**
 * Combined search and get details function
 * If only one result, automatically fetch details
 */
export async function searchAndGetDetails(query: string): Promise<{ results: SearchResult[]; singleWord?: DudenWord }> {
  const results = await searchWords(query);

  // If exactly one result, fetch details immediately as discussed
  if (results.length === 1) {
    try {
      const singleWord = await getWordDetails(results[0].urlname);
      return { results, singleWord };
    } catch {
      // If details fetch fails, just return the search result
      return { results };
    }
  }

  return { results };
}
