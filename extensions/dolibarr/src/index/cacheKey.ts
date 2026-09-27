import { createHash } from "node:crypto";

/** Occurs in neither a URL nor an API key, so no pair of values can collide by shifting the join. */
const SEPARATOR = "\u0000";

/**
 * Scopes the cached index to one instance and one API key.
 *
 * Without this the index outlives a change of preferences: search would keep answering from the
 * previous instance, and — worse — company ids taken from that index would be resolved against the
 * new one, where the same numbers belong to different customers. Including the key matters too,
 * because a second key may be allowed to see fewer companies than the one that filled the cache.
 *
 * Both values are hashed rather than used directly, so neither the address nor the secret ends up
 * in a cache key on disk.
 */
export function indexCacheKey(baseUrl: string, apiKey: string): string {
  const fingerprint = createHash("sha256").update(`${baseUrl}${SEPARATOR}${apiKey}`).digest("hex").slice(0, 16);
  return `dolibarr-index-${fingerprint}`;
}
