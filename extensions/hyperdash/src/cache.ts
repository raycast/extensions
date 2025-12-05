import { Cache } from "@raycast/api";
import type { Note } from "./utils";

// Cache configuration
const CACHE_NAMESPACE = "hyperdash-vault-scan";
const CACHE_CAPACITY = 20 * 1024 * 1024; // 20 MB
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

// Initialize cache
const cache = new Cache({
  namespace: CACHE_NAMESPACE,
  capacity: CACHE_CAPACITY,
});

// Helper to generate cache keys
function getCacheKey(vaultPath: string, suffix: string = ""): string {
  const pathHash = Buffer.from(vaultPath)
    .toString("base64")
    .replace(/[/+=]/g, "")
    .slice(0, 20);
  return suffix ? `${pathHash}-${suffix}` : pathHash;
}

/**
 * Get cached notes for a vault
 */
export function getCachedNotes(vaultPath: string): Note[] | null {
  const cacheKey = getCacheKey(vaultPath, "notes");
  const cached = cache.get(cacheKey);

  if (!cached) {
    return null;
  }

  try {
    return JSON.parse(cached) as Note[];
  } catch {
    return null;
  }
}

/**
 * Check if cache is fresh
 */
export function isCacheFresh(
  vaultPath: string,
  maxAge: number = DEFAULT_TTL,
): boolean {
  const timestampKey = getCacheKey(vaultPath, "timestamp");
  const timestamp = cache.get(timestampKey);

  if (!timestamp) return false;

  const age = Date.now() - parseInt(timestamp, 10);
  return age < maxAge;
}

/**
 * Store notes in cache
 */
export function setCachedNotes(vaultPath: string, notes: Note[]): void {
  const cacheKey = getCacheKey(vaultPath, "notes");
  const timestampKey = getCacheKey(vaultPath, "timestamp");

  cache.set(cacheKey, JSON.stringify(notes));
  cache.set(timestampKey, Date.now().toString());
}

/**
 * Clear cache for a specific vault
 */
export function clearVaultCache(vaultPath: string): void {
  const cacheKey = getCacheKey(vaultPath, "notes");
  const timestampKey = getCacheKey(vaultPath, "timestamp");

  cache.remove(cacheKey);
  cache.remove(timestampKey);
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  cache.clear();
}
