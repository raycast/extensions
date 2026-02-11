import { getPreferenceValues } from "@raycast/api";
import { Sound } from "../types";

function getCacheTTL(): number {
  try {
    const userPreferences = getPreferenceValues();
    const minutes = parseInt(userPreferences.cacheDurationMinutes ?? "60", 10);
    if (Number.isFinite(minutes) && minutes > 0) return minutes * 60 * 1000;
  } catch {
    // preferences not yet available (e.g. first load)
  }
  return 3600000; // default 1 hour
}

interface CacheEntry {
  data: Sound[];
  timestamp: number;
}

const searchCache = new Map<string, CacheEntry>();

export function getCachedResults(query: string): Sound[] | null {
  const ttl = getCacheTTL();
  const key = query.toLowerCase().trim();
  const entry = searchCache.get(key);
  if (entry && Date.now() - entry.timestamp < ttl) {
    return entry.data;
  }
  searchCache.delete(key);
  return null;
}

export function setCachedResults(query: string, data: Sound[]): void {
  searchCache.set(query.toLowerCase().trim(), {
    data,
    timestamp: Date.now(),
  });
}

export function clearCache(): void {
  searchCache.clear();
}
