import { createHash } from "node:crypto";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Cache, getPreferenceValues } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import type { ExtensionPreferences } from "./types";
import { clearSessionCache, getErrorDescription, normalizeRouterUrl } from "./ubus";

const CACHE_VERSION = 1;

interface StoredCachePayload<T> {
  version: number;
  cachedAt: number;
  data: T;
}

let cacheInstance: Cache | null = null;
const clearListeners = new Set<() => void>();

function getCache(): Cache {
  if (!cacheInstance) {
    cacheInstance = new Cache({ namespace: "openwrt-v1" });
  }
  return cacheInstance;
}

function hashSecret(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Builds a normalized, secret-free cache key scoped by router URL, optional username, and optional variant. */
export function buildCacheKey(scope: string, routerUrl?: string, variant = "", username?: string): string {
  let baseUrl = routerUrl?.trim().replace(/\/\/[^/@]+@/, "//") || "default";
  try {
    baseUrl = normalizeRouterUrl(routerUrl).baseUrl;
  } catch {
    // Keep sanitized raw URL string if preferences are temporarily invalid.
  }
  const normalizedUser = username?.trim();
  const parts = normalizedUser ? [scope, baseUrl, normalizedUser] : [scope, baseUrl];
  if (variant) {
    parts.push(variant);
  }
  return parts.join(":");
}

/** Reads a cached snapshot synchronously from Raycast Cache, returning `null` if absent or malformed. */
export function readCachedEntry<T>(key: string): { data: T; cachedAt: number } | null {
  const cache = getCache();
  try {
    const raw = cache.get(key);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<StoredCachePayload<T>> | null;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      parsed.version !== CACHE_VERSION ||
      typeof parsed.cachedAt !== "number" ||
      !Number.isFinite(parsed.cachedAt) ||
      !("data" in parsed) ||
      parsed.data === null ||
      parsed.data === undefined
    ) {
      try {
        cache.remove(key);
      } catch {
        // Ignore cache eviction errors.
      }
      return null;
    }
    return {
      data: parsed.data,
      cachedAt: parsed.cachedAt,
    };
  } catch {
    try {
      cache.remove(key);
    } catch {
      // Ignore cache eviction errors.
    }
    return null;
  }
}

/** Persists a fresh result snapshot into Raycast Cache and returns its timestamp. */
export function writeCachedEntry<T>(key: string, data: T): number {
  const cachedAt = Date.now();
  const payload: StoredCachePayload<T> = {
    version: CACHE_VERSION,
    cachedAt,
    data,
  };
  try {
    getCache().set(key, JSON.stringify(payload));
  } catch {
    // Ignore cache persistence failures so live UI updates still succeed.
  }
  return cachedAt;
}

/** Clears all persisted OpenWrt command snapshots and cached ubus sessions. */
export function clearOpenWrtCache(): void {
  clearSessionCache();
  getCache().clear();
  for (const listener of clearListeners) {
    listener();
  }
}

/** Removes a single scoped entry from Raycast Cache. */
export function invalidateCachedKey(scope: string, routerUrl?: string, variant?: string, username?: string): void {
  getCache().remove(buildCacheKey(scope, routerUrl, variant, username));
}

/**
 * Stale-while-revalidate hook backed by Raycast's synchronous Cache.
 * Renders the last persisted snapshot immediately while fetching live updates from OpenWrt.
 */
export function useCachedOpenWrtData<T>(
  scope: string,
  fetcher: (signal?: AbortSignal) => Promise<T>,
  options?: {
    variant?: string;
  },
): {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  isCached: boolean;
  isStale: boolean;
  updatedAt: number | null;
  revalidate: () => Promise<T | undefined>;
} {
  const prefs = getPreferenceValues<ExtensionPreferences>();
  const username = prefs.username?.trim() || "root";
  const cacheKey = buildCacheKey(scope, prefs.routerUrl, options?.variant ?? "", username);
  const authFingerprint = `${prefs.allowInsecureTls !== false ? "1" : "0"}:${hashSecret(prefs.password ?? "")}`;
  const [cacheEpoch, setCacheEpoch] = useState(0);
  const [liveState, setLiveState] = useState<{ key: string; data: T; updatedAt: number } | null>(null);
  const [errorState, setErrorState] = useState<{ key: string; error: Error } | null>(null);
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const abortable = useRef<AbortController | undefined>(undefined);
  const activeFetchKeyRef = useRef(cacheKey);
  const revalidateRef = useRef<() => Promise<{ key: string; data: T } | undefined>>(async () => undefined);

  useEffect(() => {
    const onClear = () => {
      setLiveState(null);
      setErrorState(null);
      setCacheEpoch((prev) => prev + 1);
      void revalidateRef.current();
    };
    clearListeners.add(onClear);
    return () => {
      clearListeners.delete(onClear);
    };
  }, []);

  const cachedEntry = useMemo(() => {
    void cacheEpoch;
    return readCachedEntry<T>(cacheKey);
  }, [cacheKey, cacheEpoch]);

  const { isLoading: baseIsLoading, revalidate: baseRevalidate } = usePromise(
    async (fetchedKey: string, _authFingerprint: string) => {
      void _authFingerprint;
      activeFetchKeyRef.current = fetchedKey;
      return {
        key: fetchedKey,
        data: await fetcher(abortable.current?.signal),
      };
    },
    [cacheKey, authFingerprint],
    {
      abortable,
      onData: (result) => {
        const updatedAt = writeCachedEntry(result.key, result.data);
        setLiveState({ key: result.key, data: result.data, updatedAt });
        setErrorState(null);
      },
      onError: (err) => {
        setErrorState({ key: activeFetchKeyRef.current, error: err });
        const { title, message } = getErrorDescription(err);
        void showFailureToast(message, { title });
      },
    },
  );

  useEffect(() => {
    setSettledKey(cacheKey);
  }, [cacheKey]);

  revalidateRef.current = baseRevalidate;

  const revalidate = useCallback(async () => {
    const result = await baseRevalidate();
    return result?.data;
  }, [baseRevalidate]);

  const hasLive = liveState !== null && liveState.key === cacheKey;
  const data = hasLive ? liveState.data : cachedEntry?.data;
  const updatedAt = hasLive ? liveState.updatedAt : (cachedEntry?.cachedAt ?? null);
  const error = errorState?.key === cacheKey ? errorState.error : undefined;
  const isLoading = baseIsLoading || (settledKey !== cacheKey && !hasLive);
  const isCached = !hasLive && cachedEntry !== null;
  const isStale = isCached || Boolean(error && data !== undefined);

  return {
    data,
    error,
    isLoading,
    isCached,
    isStale,
    updatedAt,
    revalidate,
  };
}
