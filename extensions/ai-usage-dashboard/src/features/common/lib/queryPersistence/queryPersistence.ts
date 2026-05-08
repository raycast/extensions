import type {
  PersistedClient,
  Persister,
} from "@tanstack/react-query-persist-client";

export type AsyncStringStorage = {
  getItem: (key: string) => Promise<string | undefined>;
  removeItem: (key: string) => Promise<void>;
  setItem: (key: string, value: string) => Promise<void>;
};

export const QUERY_CACHE_BUSTER = "ai-usage-dashboard-v1";
export const QUERY_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24;
export const QUERY_CACHE_STORAGE_KEY = "aiUsageDashboard.queryCache";

export const createLocalStoragePersister = (
  storage: AsyncStringStorage,
): Persister => ({
  persistClient: async (client: PersistedClient) => {
    await storage.setItem(QUERY_CACHE_STORAGE_KEY, JSON.stringify(client));
  },
  removeClient: async () => {
    await storage.removeItem(QUERY_CACHE_STORAGE_KEY);
  },
  restoreClient: async () => {
    const cache = await storage.getItem(QUERY_CACHE_STORAGE_KEY);

    return cache ? (JSON.parse(cache) as PersistedClient) : undefined;
  },
});
