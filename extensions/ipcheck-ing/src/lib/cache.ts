import { Cache } from "@raycast/api";

/** Rolling window: an entry stays valid for 24 hours from the moment it was written. */
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface Envelope<T> {
  storedAt: number;
  value: T;
}

class TTLCache {
  private readonly cache: Cache;

  constructor(namespace: string) {
    this.cache = new Cache({ namespace });
  }

  read<T>(key: string, maxAgeMs = CACHE_TTL_MS): T | undefined {
    const raw = this.cache.get(key);
    if (raw === undefined) return undefined;

    try {
      const envelope = JSON.parse(raw) as Envelope<T>;
      const ageMs = Date.now() - envelope.storedAt;

      // A clock that jumped backwards would otherwise pin an entry as forever-fresh.
      if (ageMs < 0 || ageMs > maxAgeMs) {
        this.cache.remove(key);
        return undefined;
      }

      return envelope.value;
    } catch {
      this.cache.remove(key);
      return undefined;
    }
  }

  write<T>(key: string, value: T): void {
    this.cache.set(key, JSON.stringify({ storedAt: Date.now(), value } satisfies Envelope<T>));
  }
}

/**
 * Cached geolocation and IP-detail lookups — the services we talk to that are rate limited.
 * The `cdn-cgi/trace` sources are never cached: they exist to answer "what is my IP right now".
 */
export const lookupCache = new TTLCache("lookups");
