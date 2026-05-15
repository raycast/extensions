import { LocalStorage } from "@raycast/api";
import type { RaindropBookmark } from "./types";

const CACHE_KEY = "recent_bookmarks";
const MAX_CACHE_SIZE = 100;

/** Load recently accessed bookmarks from local storage */
export async function loadRecentBookmarks(): Promise<RaindropBookmark[]> {
  const raw = await LocalStorage.getItem<string>(CACHE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as RaindropBookmark[];
  } catch {
    return [];
  }
}

/** Push a bookmark to the MRU cache (dedup + cap at MAX_CACHE_SIZE) */
export async function pushRecentBookmark(
  bookmark: RaindropBookmark,
): Promise<void> {
  const current = await loadRecentBookmarks();
  const filtered = current.filter((b) => b._id !== bookmark._id);
  filtered.unshift(bookmark);
  const capped = filtered.slice(0, MAX_CACHE_SIZE);
  await LocalStorage.setItem(CACHE_KEY, JSON.stringify(capped));
}

/** Clear the bookmark cache */
export async function clearRecentBookmarks(): Promise<void> {
  await LocalStorage.removeItem(CACHE_KEY);
}
