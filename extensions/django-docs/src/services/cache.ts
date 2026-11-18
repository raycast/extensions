import { Cache } from "@raycast/api";
import { DocEntry } from "../types/DocEntry";
import { DjangoVersion } from "../constants";
import { SerializableEntry, serializeEntries, deserializeEntries } from "./serialization";

interface CachedData {
  entries: SerializableEntry[];
  lastRefresh: number;
}

const cache = new Cache();
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function getCacheKey(version: DjangoVersion): string {
  return `django-docs-${version}`;
}

export function readCache(version: DjangoVersion): DocEntry[] | null {
  const data = cache.get(getCacheKey(version));
  if (!data) {
    return null;
  }

  try {
    const cached: CachedData = JSON.parse(data);
    return deserializeEntries(cached.entries);
  } catch {
    return null;
  }
}

export function writeCache(version: DjangoVersion, entries: DocEntry[]): void {
  const data: CachedData = {
    entries: serializeEntries(entries),
    lastRefresh: Date.now(),
  };

  cache.set(getCacheKey(version), JSON.stringify(data));
}

export function getCacheAge(version: DjangoVersion): number | null {
  const data = cache.get(getCacheKey(version));
  if (!data) {
    return null;
  }

  try {
    const cached: CachedData = JSON.parse(data);
    return Date.now() - cached.lastRefresh;
  } catch {
    return null;
  }
}

export function shouldRefresh(version: DjangoVersion, maxAgeMs: number = SEVEN_DAYS_MS): boolean {
  const age = getCacheAge(version);

  if (age === null) {
    return true; // No cache exists
  }

  return age > maxAgeMs;
}

export function getLastRefreshDate(version: DjangoVersion): Date | null {
  const data = cache.get(getCacheKey(version));
  if (!data) {
    return null;
  }

  try {
    const cached: CachedData = JSON.parse(data);
    return new Date(cached.lastRefresh);
  } catch {
    return null;
  }
}
