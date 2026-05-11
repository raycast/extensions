import { describe, expect, it } from "vitest";
import {
  createLocalStoragePersister,
  QUERY_CACHE_BUSTER,
  QUERY_CACHE_MAX_AGE_MS,
  QUERY_CACHE_STORAGE_KEY,
} from "./queryPersistence";
import type { PersistedClient } from "@tanstack/react-query-persist-client";

const persistedClient: PersistedClient = {
  buster: QUERY_CACHE_BUSTER,
  clientState: {
    mutations: [],
    queries: [],
  },
  timestamp: 1_778_000_000_000,
};

const createMemoryStorage = () => {
  const store = new Map<string, string>();

  return {
    getItem: async (key: string) => store.get(key),
    removeItem: async (key: string) => {
      store.delete(key);
    },
    setItem: async (key: string, value: string) => {
      store.set(key, value);
    },
    store,
  };
};

describe("createLocalStoragePersister", () => {
  it("persists and restores a dehydrated query client", async () => {
    const storage = createMemoryStorage();
    const persister = createLocalStoragePersister(storage);

    await persister.persistClient(persistedClient);

    expect(
      JSON.parse(storage.store.get(QUERY_CACHE_STORAGE_KEY) ?? ""),
    ).toEqual(persistedClient);
    await expect(persister.restoreClient()).resolves.toEqual(persistedClient);
  });

  it("removes persisted query data", async () => {
    const storage = createMemoryStorage();
    const persister = createLocalStoragePersister(storage);

    await persister.persistClient(persistedClient);
    await persister.removeClient();

    await expect(persister.restoreClient()).resolves.toBeUndefined();
  });

  it("exposes cache lifetime settings used by the provider", () => {
    expect(QUERY_CACHE_MAX_AGE_MS).toBe(1000 * 60 * 60 * 24);
    expect(QUERY_CACHE_BUSTER).toBe("ai-usage-dashboard-v1");
  });
});
