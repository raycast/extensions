type CacheEntry<T> = {
  value?: T;
  expiresAt: number;
  inflight?: Promise<T>;
};

const cache = new Map<string, CacheEntry<unknown>>();

export function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

export async function withShortLivedCache<T>(
  key: string,
  loader: () => Promise<T>,
  options: { ttlMs: number; forceRefresh?: boolean },
) {
  const existingEntry = cache.get(key) as CacheEntry<T> | undefined;
  const now = Date.now();

  if (
    !options.forceRefresh &&
    existingEntry?.value !== undefined &&
    existingEntry.expiresAt > now
  ) {
    return existingEntry.value;
  }

  if (!options.forceRefresh && existingEntry?.inflight) {
    return existingEntry.inflight;
  }

  const inflight = loader()
    .then((value) => {
      cache.set(key, {
        value,
        expiresAt: Date.now() + options.ttlMs,
      });
      return value;
    })
    .catch((error) => {
      if (existingEntry?.value !== undefined) {
        cache.set(key, {
          value: existingEntry.value,
          expiresAt: existingEntry.expiresAt,
        });
      } else {
        cache.delete(key);
      }

      throw error;
    });

  cache.set(key, {
    value: existingEntry?.value,
    expiresAt: existingEntry?.expiresAt ?? 0,
    inflight,
  });

  return inflight;
}

export function clearCacheKey(key: string) {
  cache.delete(key);
}
