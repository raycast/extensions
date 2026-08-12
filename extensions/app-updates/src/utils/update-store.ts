import { Cache, LocalStorage } from "@raycast/api";
import type { AppUpdate } from "./types";

const STORAGE_KEY = "shared-updates";

/**
 * Cache is synchronous and shared across commands of the same extension.
 * Use this over LocalStorage when you need instant reads (e.g., menu bar init)
 * to avoid a blank-then-populated flicker.
 */
const cache = new Cache();

export function getStoredUpdatesSync(): AppUpdate[] {
  const raw = cache.get(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as AppUpdate[];
  } catch {
    return [];
  }
}

/**
 * Async variant — kept for callers that already await LocalStorage.
 * Reads from Cache first for consistency.
 */
export async function getStoredUpdates(): Promise<AppUpdate[]> {
  const fromCache = getStoredUpdatesSync();
  if (fromCache.length > 0) return fromCache;
  // Fallback to legacy LocalStorage for backward compatibility with older installs
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as AppUpdate[];
  } catch {
    return [];
  }
}

export async function storeUpdates(updates: AppUpdate[]): Promise<void> {
  const serialized = JSON.stringify(updates);
  cache.set(STORAGE_KEY, serialized);
  await LocalStorage.setItem(STORAGE_KEY, serialized);
}
