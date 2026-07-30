import assert from "node:assert/strict";
import test from "node:test";
import { createCatalogHistoryStore } from "../src/lib/catalog-history.ts";

function deferred() {
  let resolve = () => undefined;
  const promise = new Promise<void>((fulfill) => {
    resolve = fulfill;
  });
  return { promise, resolve };
}

test("hydrates current subscribers and survives unsubscribe-resubscribe cycles", async () => {
  const hydration = deferred();
  const updates: string[][] = [];
  const store = createCatalogHistoryStore({
    readFavorites: async () => {
      await hydration.promise;
      return ["favorite"];
    },
    readRecents: async () => ["recent"],
    writeFavorites: async () => undefined,
    writeRecents: async () => undefined,
  });

  const unsubscribe = store.subscribe(() => updates.push(store.getSnapshot().favoriteIds));
  const hydrationPromise = store.hydrate();
  unsubscribe();
  store.subscribe(() => updates.push(store.getSnapshot().favoriteIds));
  hydration.resolve();
  await hydrationPromise;

  assert.deepEqual(store.getSnapshot(), { favoriteIds: ["favorite"], recentIds: ["recent"] });
  assert.deepEqual(updates, [["favorite"]]);
});

test("publishes favorite changes immediately while serializing writes", async () => {
  const firstWrite = deferred();
  const writes: string[][] = [];
  const updates: string[][] = [];
  const store = createCatalogHistoryStore({
    readFavorites: async () => [],
    readRecents: async () => [],
    writeFavorites: async (ids) => {
      writes.push(ids);
      if (writes.length === 1) await firstWrite.promise;
    },
    writeRecents: async () => undefined,
  });
  store.subscribe(() => updates.push(store.getSnapshot().favoriteIds));
  await store.hydrate();

  const addFirst = store.toggleFavorite("first");
  await Promise.resolve();
  const addSecond = store.toggleFavorite("second");
  await Promise.resolve();
  await Promise.resolve();

  assert.deepEqual(store.getSnapshot().favoriteIds, ["second", "first"]);
  assert.deepEqual(updates.slice(-2), [["first"], ["second", "first"]]);
  assert.deepEqual(writes, [["first"]], "second write must wait for the first write");

  firstWrite.resolve();
  await Promise.all([addFirst, addSecond]);
  assert.deepEqual(writes, [["first"], ["second", "first"]]);
});

test("deduplicates and caps recent commands before persisting them", async () => {
  const writes: string[][] = [];
  const store = createCatalogHistoryStore({
    readFavorites: async () => [],
    readRecents: async () => ["older", "oldest"],
    writeFavorites: async () => undefined,
    writeRecents: async (ids) => {
      writes.push(ids);
    },
    recentLimit: 3,
  });

  await store.hydrate();
  await store.recordRecent("oldest");
  await store.recordRecent("new");

  assert.deepEqual(store.getSnapshot().recentIds, ["new", "oldest", "older"]);
  assert.deepEqual(writes, [
    ["oldest", "older"],
    ["new", "oldest", "older"],
  ]);
});

test("retries hydration after a storage read failure", async () => {
  let attempts = 0;
  const store = createCatalogHistoryStore({
    readFavorites: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("temporary read failure");
      return ["favorite"];
    },
    readRecents: async () => [],
    writeFavorites: async () => undefined,
    writeRecents: async () => undefined,
  });

  await assert.rejects(store.hydrate(), /temporary read failure/);
  await store.hydrate();

  assert.equal(attempts, 2);
  assert.deepEqual(store.getSnapshot().favoriteIds, ["favorite"]);
});

test("rolls back optimistic history updates when storage writes fail", async () => {
  const store = createCatalogHistoryStore({
    readFavorites: async () => ["saved"],
    readRecents: async () => ["recent"],
    writeFavorites: async () => {
      throw new Error("favorite write failure");
    },
    writeRecents: async () => {
      throw new Error("recent write failure");
    },
  });

  await store.hydrate();
  await assert.rejects(store.toggleFavorite("new"), /favorite write failure/);
  assert.deepEqual(store.getSnapshot().favoriteIds, ["saved"]);

  await assert.rejects(store.recordRecent("new"), /recent write failure/);
  assert.deepEqual(store.getSnapshot().recentIds, ["recent"]);
});
