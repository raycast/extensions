import { LocalStorage } from "@raycast/api";
import {
  MAX_MRU_ITEMS,
  MRU_STORAGE_KEY,
  SEARCH_CACHE_STORAGE_KEY,
  SEARCH_CACHE_TTL_MS,
} from "./constants";

interface SearchCacheEntry {
  createdAt: number;
  files: string[];
}

type SearchCacheMap = Record<string, SearchCacheEntry>;

const searchCache = new Map<string, SearchCacheEntry>();

function isValidCacheEntry(value: unknown): value is SearchCacheEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as { createdAt?: unknown; files?: unknown };
  if (typeof entry.createdAt !== "number") return false;
  if (!Array.isArray(entry.files)) return false;
  return entry.files.every((file) => typeof file === "string");
}

function isExpired(entry: SearchCacheEntry): boolean {
  return Date.now() - entry.createdAt > SEARCH_CACHE_TTL_MS;
}

async function readPersistentCacheMap(): Promise<SearchCacheMap> {
  const raw = await LocalStorage.getItem<string>(SEARCH_CACHE_STORAGE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const map: SearchCacheMap = {};

    for (const [key, value] of Object.entries(parsed)) {
      if (isValidCacheEntry(value) && !isExpired(value)) {
        map[key] = value;
      }
    }

    return map;
  } catch {
    return {};
  }
}

async function writePersistentCacheMap(map: SearchCacheMap): Promise<void> {
  if (Object.keys(map).length === 0) {
    await LocalStorage.removeItem(SEARCH_CACHE_STORAGE_KEY);
    return;
  }

  await LocalStorage.setItem(SEARCH_CACHE_STORAGE_KEY, JSON.stringify(map));
}

export async function getCachedFiles(
  cacheKey: string,
): Promise<string[] | undefined> {
  const cacheEntry = searchCache.get(cacheKey);
  if (cacheEntry && !isExpired(cacheEntry)) {
    return cacheEntry.files;
  }
  if (cacheEntry && isExpired(cacheEntry)) {
    searchCache.delete(cacheKey);
  }

  const persistentCache = await readPersistentCacheMap();
  const persistedEntry = persistentCache[cacheKey];
  if (!persistedEntry) return undefined;

  searchCache.set(cacheKey, persistedEntry);
  return persistedEntry.files;
}

export async function setCachedFiles(
  cacheKey: string,
  files: string[],
): Promise<void> {
  const entry: SearchCacheEntry = {
    createdAt: Date.now(),
    files,
  };

  searchCache.set(cacheKey, entry);
  const persistentCache = await readPersistentCacheMap();
  persistentCache[cacheKey] = entry;
  await writePersistentCacheMap(persistentCache);
}

export async function getMruFiles(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(MRU_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export async function touchMruFile(filePath: string): Promise<void> {
  const existing = await getMruFiles();
  const deduped = [
    filePath,
    ...existing.filter((item) => item !== filePath),
  ].slice(0, MAX_MRU_ITEMS);
  await LocalStorage.setItem(MRU_STORAGE_KEY, JSON.stringify(deduped));
}

export function sortByMru(files: string[], mruFiles: string[]): string[] {
  const ranks = new Map<string, number>(
    mruFiles.map((file, index) => [file, index]),
  );

  return [...files].sort((left, right) => {
    const leftRank = ranks.get(left);
    const rightRank = ranks.get(right);

    if (leftRank !== undefined && rightRank !== undefined)
      return leftRank - rightRank;
    if (leftRank !== undefined) return -1;
    if (rightRank !== undefined) return 1;

    return left.localeCompare(right);
  });
}
