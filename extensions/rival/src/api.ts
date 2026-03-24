// --------------------------------------------------------------------------
// Rival Raycast Extension - API Client with LocalStorage caching
// --------------------------------------------------------------------------

import { LocalStorage, showToast, Toast } from "@raycast/api";
import { CACHE_KEY, CACHE_TTL_MS, LENS_API_URL } from "./constants.js";
import type { CachedLensData, LensPayload } from "./types.js";

/**
 * Fetches the Rival Lens payload, returning a cached version when fresh.
 *
 * Cache strategy:
 * - Stores the full payload + timestamp in Raycast LocalStorage.
 * - Serves from cache if the entry is less than 1 hour old.
 * - On network failure, falls back to stale cache (any age) with a warning toast.
 */
export async function fetchModels(): Promise<LensPayload> {
  // 1. Check cache
  const raw = await LocalStorage.getItem<string>(CACHE_KEY);

  if (raw) {
    try {
      const cached: CachedLensData = JSON.parse(raw);
      const age = Date.now() - cached.cachedAt;

      if (age < CACHE_TTL_MS) {
        return cached.payload;
      }
    } catch {
      // Corrupted cache, continue to fetch
    }
  }

  // 2. Fetch from API
  try {
    const res = await fetch(LENS_API_URL, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const payload = (await res.json()) as LensPayload;

    // 3. Persist to cache
    const cached: CachedLensData = { payload, cachedAt: Date.now() };
    await LocalStorage.setItem(CACHE_KEY, JSON.stringify(cached));

    return payload;
  } catch (err) {
    // 4. Network error - try stale cache as fallback
    if (raw) {
      try {
        const stale: CachedLensData = JSON.parse(raw);
        await showToast({
          style: Toast.Style.Failure,
          title: "Using cached data",
          message: "Could not reach rival.tips. Showing last known data.",
        });
        return stale.payload;
      } catch {
        // Corrupted stale cache too, nothing we can do
      }
    }

    // 5. No cache at all
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to load models",
      message: err instanceof Error ? err.message : "Unknown error",
    });

    throw err;
  }
}

/**
 * Clears the cached payload so the next call fetches fresh data.
 */
export async function clearCache(): Promise<void> {
  await LocalStorage.removeItem(CACHE_KEY);
}
