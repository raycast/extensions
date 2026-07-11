import { Cache, getPreferenceValues } from "@raycast/api";
import { UsageLimitData } from "../types/usage-types";
import { getClaudeAccessToken } from "./keychain-access";
import { fetchClaudeUsageLimits } from "./claude-api-client";
import type { UsageLimitsResult } from "./claude-api-client";

interface CacheState {
  data: UsageLimitData | null;
  error: Error | null;
  isLoading: boolean;
  isStale: boolean;
  isRateLimited: boolean;
  isUsageLimitsAvailable: boolean;
  lastFetched: Date | null;
  rateLimitedUntil: number | null;
  nextRefreshAt: number | null;
}

type Listener = (state: CacheState) => void;

const raycastCache = new Cache();
const LIMITS_CACHE_KEY = "usage-limits-data";
const RATE_LIMITED_UNTIL_KEY = "usage-limits-rate-limited-until";
const LAST_FETCHED_KEY = "usage-limits-last-fetched";

const FETCH_INTERVAL_MS = ((): number => {
  const seconds = parseInt(getPreferenceValues<Preferences>().usageLimitsRefreshInterval || "60", 10);
  return Number.isNaN(seconds) ? 60 * 1000 : seconds * 1000;
})();

const isBlobStale = (lastFetched: Date | null): boolean =>
  lastFetched === null || Date.now() - lastFetched.getTime() >= FETCH_INTERVAL_MS;

const restoredData = ((): UsageLimitData | null => {
  const cached = raycastCache.get(LIMITS_CACHE_KEY);
  if (!cached) return null;
  try {
    return JSON.parse(cached) as UsageLimitData;
  } catch {
    return null;
  }
})();

const restoredLastFetched = ((): Date | null => {
  const cached = raycastCache.get(LAST_FETCHED_KEY);
  if (!cached) return null;
  const parsed = parseInt(cached, 10);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
})();

const restoredRateLimitedUntil = ((): number | null => {
  const cached = raycastCache.get(RATE_LIMITED_UNTIL_KEY);
  if (!cached) return null;
  const parsed = parseInt(cached, 10);
  if (Number.isNaN(parsed) || parsed <= Date.now()) return null;
  return parsed;
})();

let cacheState: CacheState = {
  data: restoredData,
  error: null,
  isLoading: restoredRateLimitedUntil === null && (restoredData === null || isBlobStale(restoredLastFetched)),
  isStale: restoredData !== null && isBlobStale(restoredLastFetched),
  isRateLimited: restoredRateLimitedUntil !== null,
  isUsageLimitsAvailable: false,
  lastFetched: restoredLastFetched,
  rateLimitedUntil: restoredRateLimitedUntil,
  nextRefreshAt: null,
};

const RATE_LIMIT_BACKOFF_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX_BACKOFF_MS = 60 * 60 * 1000;

const clampBackoff = (retryAfterMs: number | null): number => {
  const requested = retryAfterMs ?? RATE_LIMIT_BACKOFF_MS;
  return Math.min(RATE_LIMIT_MAX_BACKOFF_MS, Math.max(RATE_LIMIT_BACKOFF_MS, requested));
};

const listeners = new Set<Listener>();
let fetchInterval: NodeJS.Timeout | null = null;
let isFetching = false;
let rateLimitedUntil: number | null = restoredRateLimitedUntil;

const notifyListeners = (): void => {
  listeners.forEach((listener) => listener(cacheState));
};

const fetchUsageLimits = async (): Promise<void> => {
  if (isFetching) return;
  if (rateLimitedUntil !== null && Date.now() < rateLimitedUntil) return;

  isFetching = true;
  const previousData = cacheState.data;

  try {
    const token = await getClaudeAccessToken();
    const isUsageLimitsAvailable = typeof token === "string" && token.trim().length > 0;

    if (!isUsageLimitsAvailable) {
      cacheState = {
        data: null,
        error: null,
        isLoading: false,
        isStale: false,
        isRateLimited: false,
        isUsageLimitsAvailable: false,
        lastFetched: null,
        rateLimitedUntil: null,
        nextRefreshAt: null,
      };
      notifyListeners();
      return;
    }

    const result: UsageLimitsResult = await fetchClaudeUsageLimits(token);

    if (result.status === "ok") {
      const fetchedAt = new Date();
      rateLimitedUntil = null;
      raycastCache.remove(RATE_LIMITED_UNTIL_KEY);
      raycastCache.set(LIMITS_CACHE_KEY, JSON.stringify(result.data));
      raycastCache.set(LAST_FETCHED_KEY, String(fetchedAt.getTime()));
      cacheState = {
        data: result.data,
        error: null,
        isLoading: false,
        isRateLimited: false,
        isUsageLimitsAvailable: true,
        isStale: false,
        lastFetched: fetchedAt,
        rateLimitedUntil: null,
        nextRefreshAt: Date.now() + FETCH_INTERVAL_MS,
      };
    } else if (result.status === "rate_limited") {
      rateLimitedUntil = Date.now() + clampBackoff(result.retryAfterMs);
      raycastCache.set(RATE_LIMITED_UNTIL_KEY, String(rateLimitedUntil));
      cacheState = {
        ...cacheState,
        data: previousData,
        error: null,
        isLoading: false,
        isRateLimited: true,
        isUsageLimitsAvailable: true,
        isStale: previousData !== null,
        rateLimitedUntil,
      };
    } else {
      cacheState = {
        ...cacheState,
        data: previousData,
        error: new Error(result.message),
        isLoading: false,
        isRateLimited: false,
        isUsageLimitsAvailable: true,
        isStale: previousData !== null,
      };
    }
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Unknown error occurred");
    cacheState = {
      ...cacheState,
      data: previousData,
      error,
      isLoading: false,
      isUsageLimitsAvailable: cacheState.isUsageLimitsAvailable,
      isStale: previousData !== null,
    };
  } finally {
    isFetching = false;
    notifyListeners();
  }
};

const startFetching = (): void => {
  if (fetchInterval) return;

  if (!cacheState.data || isBlobStale(cacheState.lastFetched)) {
    fetchUsageLimits();
  }

  fetchInterval = setInterval(fetchUsageLimits, FETCH_INTERVAL_MS);
};

const stopFetching = (): void => {
  if (fetchInterval) {
    clearInterval(fetchInterval);
    fetchInterval = null;
  }
};

export const subscribeToUsageLimits = (listener: Listener): (() => void) => {
  listeners.add(listener);
  listener(cacheState);

  if (listeners.size === 1) {
    startFetching();
  }

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      stopFetching();
    }
  };
};

export const getUsageLimitsState = (): CacheState => cacheState;

export const revalidateUsageLimits = async (): Promise<void> => {
  rateLimitedUntil = null;
  raycastCache.remove(RATE_LIMITED_UNTIL_KEY);
  await fetchUsageLimits();
};
