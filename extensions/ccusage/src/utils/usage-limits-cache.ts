import { Cache, getPreferenceValues } from "@raycast/api";
import { UsageLimitData } from "../types/usage-types";
import { getClaudeAccessToken } from "./keychain-access";
import { fetchClaudeUsageLimits } from "./claude-api-client";

interface CacheState {
  data: UsageLimitData | null;
  error: Error | null;
  isLoading: boolean;
  isStale: boolean;
  isUsageLimitsAvailable: boolean;
  lastFetched: Date | null;
}

type Listener = (state: CacheState) => void;

interface PersistedUsageLimitsAvailability {
  isAvailable: boolean;
  lastCheckedAt: string;
}

const availabilityCache = new Cache();
const USAGE_LIMITS_AVAILABILITY_CACHE_KEY = "usage-limits-availability";

const readPersistedAvailability = (): PersistedUsageLimitsAvailability | null => {
  const cachedValue = availabilityCache.get(USAGE_LIMITS_AVAILABILITY_CACHE_KEY);

  if (!cachedValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(cachedValue) as Partial<PersistedUsageLimitsAvailability>;

    if (typeof parsedValue.isAvailable !== "boolean" || typeof parsedValue.lastCheckedAt !== "string") {
      availabilityCache.remove(USAGE_LIMITS_AVAILABILITY_CACHE_KEY);
      return null;
    }

    return {
      isAvailable: parsedValue.isAvailable,
      lastCheckedAt: parsedValue.lastCheckedAt,
    };
  } catch {
    availabilityCache.remove(USAGE_LIMITS_AVAILABILITY_CACHE_KEY);
    return null;
  }
};

const persistAvailability = (isAvailable: boolean): void => {
  const persistedValue: PersistedUsageLimitsAvailability = {
    isAvailable,
    lastCheckedAt: new Date().toISOString(),
  };

  availabilityCache.set(USAGE_LIMITS_AVAILABILITY_CACHE_KEY, JSON.stringify(persistedValue));
};

const createInitialCacheState = (): CacheState => {
  const persistedAvailability = readPersistedAvailability();

  if (!persistedAvailability) {
    return {
      data: null,
      error: null,
      isLoading: true,
      isStale: false,
      isUsageLimitsAvailable: false,
      lastFetched: null,
    };
  }

  return {
    data: null,
    error: null,
    isLoading: persistedAvailability.isAvailable,
    isStale: false,
    isUsageLimitsAvailable: persistedAvailability.isAvailable,
    lastFetched: null,
  };
};

let cacheState: CacheState = createInitialCacheState();

const listeners = new Set<Listener>();
let fetchInterval: NodeJS.Timeout | null = null;
let isFetching = false;

const notifyListeners = (): void => {
  listeners.forEach((listener) => listener(cacheState));
};

const fetchUsageLimits = async (): Promise<void> => {
  if (isFetching) return;

  isFetching = true;
  const previousData = cacheState.data;

  try {
    const token = await getClaudeAccessToken();

    const isUsageLimitsAvailable = typeof token === "string" && token.trim().length > 0;
    persistAvailability(isUsageLimitsAvailable);

    if (!isUsageLimitsAvailable) {
      cacheState = {
        data: null,
        error: null,
        isLoading: false,
        isStale: false,
        isUsageLimitsAvailable: false,
        lastFetched: null,
      };
      notifyListeners();
      return;
    }

    cacheState = {
      ...cacheState,
      error: null,
      isLoading: previousData === null,
      isUsageLimitsAvailable: true,
    };
    notifyListeners();

    const limitData = await fetchClaudeUsageLimits(token);

    if (limitData) {
      cacheState = {
        data: limitData,
        error: null,
        isLoading: false,
        isUsageLimitsAvailable: true,
        isStale: false,
        lastFetched: new Date(),
      };
    } else {
      const error = new Error("Failed to fetch usage limits from API");
      cacheState = {
        ...cacheState,
        data: previousData,
        error,
        isLoading: false,
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
  await fetchUsageLimits();
};
