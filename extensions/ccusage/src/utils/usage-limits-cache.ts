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

const restoredData = ((): UsageLimitData | null => {
  const cached = raycastCache.get(LIMITS_CACHE_KEY);
  if (!cached) return null;
  try {
    return JSON.parse(cached) as UsageLimitData;
  } catch {
    return null;
  }
})();

let cacheState: CacheState = {
  data: restoredData,
  error: null,
  isLoading: true,
  isStale: restoredData !== null,
  isRateLimited: false,
  isUsageLimitsAvailable: false,
  lastFetched: null,
  rateLimitedUntil: null,
  nextRefreshAt: null,
};

const RATE_LIMIT_BACKOFF_MS = 5 * 60 * 1000;

const listeners = new Set<Listener>();
let fetchInterval: NodeJS.Timeout | null = null;
let isFetching = false;
let rateLimitedUntil: number | null = null;
let fetchIntervalMs = 60 * 1000;

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
      rateLimitedUntil = null;
      raycastCache.set(LIMITS_CACHE_KEY, JSON.stringify(result.data));
      cacheState = {
        data: result.data,
        error: null,
        isLoading: false,
        isRateLimited: false,
        isUsageLimitsAvailable: true,
        isStale: false,
        lastFetched: new Date(),
        rateLimitedUntil: null,
        nextRefreshAt: Date.now() + fetchIntervalMs,
      };
    } else if (result.status === "rate_limited") {
      rateLimitedUntil = Date.now() + RATE_LIMIT_BACKOFF_MS;
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

  const preferences = getPreferenceValues<Preferences>();
  const intervalSeconds = parseInt(preferences.usageLimitsRefreshInterval || "60", 10);
  const intervalMs = intervalSeconds * 1000;
  fetchIntervalMs = intervalMs;

  const shouldFetchImmediately = (): boolean => {
    if (!cacheState.data || !cacheState.lastFetched) {
      return true;
    }

    const timeSinceLastFetch = Date.now() - cacheState.lastFetched.getTime();
    return timeSinceLastFetch >= intervalMs;
  };

  if (shouldFetchImmediately()) {
    fetchUsageLimits();
  }

  fetchInterval = setInterval(fetchUsageLimits, intervalMs);
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
  await fetchUsageLimits();
};
