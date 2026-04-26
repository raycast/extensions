import { Cache } from "@raycast/api";
import { createHash } from "crypto";

const cache = new Cache();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  fixed: string;
  timestamp: number;
}

export function cacheKey(text: string, systemPrompt: string): string {
  return createHash("sha256").update(`${systemPrompt}::${text}`).digest("hex");
}

export function getCached(key: string): string | undefined {
  const raw = cache.get(key);
  if (!raw) return undefined;
  const entry: CacheEntry = JSON.parse(raw);
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.remove(key);
    return undefined;
  }
  return entry.fixed;
}

export function setCached(key: string, fixed: string): void {
  cache.set(
    key,
    JSON.stringify({ fixed, timestamp: Date.now() } satisfies CacheEntry),
  );
}
