/**
 * API access layer for fetching arts
 */
import { LocalStorage } from "@raycast/api";
import type { Kaomoji } from "../types";
import { CACHE_TTL_MS, STORAGE_KEYS } from "../constants";

// API URL - will be set to production URL after deployment
const API_URL = "https://moji-art.spherestacking.com/api/v1/arts";

/**
 * Fetch arts from API with caching
 */
export async function fetchArts(): Promise<Kaomoji[]> {
  // Check cache first
  const cachedTimestamp = await LocalStorage.getItem<string>(STORAGE_KEYS.artsCacheTimestamp);
  if (cachedTimestamp) {
    const timestamp = parseInt(cachedTimestamp, 10);
    if (Date.now() - timestamp < CACHE_TTL_MS) {
      const cached = await LocalStorage.getItem<string>(STORAGE_KEYS.artsCache);
      if (cached) {
        return JSON.parse(cached) as Kaomoji[];
      }
    }
  }

  // Fetch from API
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = (await response.json()) as Kaomoji[];

    // Save to cache
    await LocalStorage.setItem(STORAGE_KEYS.artsCache, JSON.stringify(data));
    await LocalStorage.setItem(STORAGE_KEYS.artsCacheTimestamp, Date.now().toString());

    return data;
  } catch (error) {
    // If fetch fails, try to use cached data even if expired
    const cached = await LocalStorage.getItem<string>(STORAGE_KEYS.artsCache);
    if (cached) {
      return JSON.parse(cached) as Kaomoji[];
    }
    throw error;
  }
}
