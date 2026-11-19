import { LocalStorage } from "@raycast/api";
import type { TeamFiles } from "./types";
import { PROJECT_FILES_CONFIG } from "./lib/fileStorage";

// How long a team's folder tree and each folder's file list stay fresh
const REFRESH_TTL_MINUTES = 30;
const REFRESH_TIMES_CACHE_KEY = "FOLDER_REFRESH_TIMES";
// Written by versions before nested folder support
const LEGACY_PROJECT_TTL_CACHE_KEY = "PROJECT_TTLS";

// Last successful fetch time in ms, keyed by `team:<teamId>` for folder trees and by folder ID for file lists
export type RefreshTimes = Record<string, number>;

const PAGES_CACHE_KEY = "PAGES";

export async function loadRefreshTimes(): Promise<RefreshTimes> {
  const item = await LocalStorage.getItem<string>(REFRESH_TIMES_CACHE_KEY);
  if (item) {
    try {
      return JSON.parse(item) as RefreshTimes;
    } catch {
      return {};
    }
  }
  return {};
}

export async function saveRefreshTimes(times: RefreshTimes): Promise<void> {
  await LocalStorage.setItem(REFRESH_TIMES_CACHE_KEY, JSON.stringify(times));
}

export function isFresh(times: RefreshTimes, key: string): boolean {
  const lastFetched = times[key];
  return lastFetched !== undefined && Date.now() - lastFetched < REFRESH_TTL_MINUTES * 60 * 1000;
}

export function markFresh(times: RefreshTimes, key: string): void {
  times[key] = Date.now();
}

export async function storeFiles(teamFiles: TeamFiles[]): Promise<void> {
  const data = JSON.stringify(teamFiles);
  await LocalStorage.setItem(PROJECT_FILES_CONFIG.storageKey, data);
}

export async function loadFiles(): Promise<TeamFiles[] | undefined> {
  const item = await LocalStorage.getItem<string>(PROJECT_FILES_CONFIG.storageKey);
  if (item) {
    try {
      const parsed = JSON.parse(item) as TeamFiles[];
      // Caches from before nested folder support have no team ID or folder list; drop them so they get refetched
      return Array.isArray(parsed) ? parsed.filter((team) => team.id && Array.isArray(team.folders)) : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

async function clearPagesCache() {
  try {
    const items = await LocalStorage.allItems();
    // Find and remove all items that start with PAGES_CACHE_KEY-
    const promises = Object.keys(items)
      .filter((key) => key.startsWith(`${PAGES_CACHE_KEY}-`))
      .map((key) => LocalStorage.removeItem(key));
    await Promise.all(promises);
  } catch (error) {
    console.error("Error clearing pages cache:", error);
  }
}

export async function clearFiles(): Promise<void> {
  await LocalStorage.removeItem(PROJECT_FILES_CONFIG.storageKey);
  await LocalStorage.removeItem(REFRESH_TIMES_CACHE_KEY);
  await LocalStorage.removeItem(LEGACY_PROJECT_TTL_CACHE_KEY);
  await clearPagesCache();
}
