import assert from "node:assert/strict";
import { test } from "node:test";
import { createListStore } from "../src/list-store";

test("updates from two views preserve persisted entries even before initial loading", async () => {
  let saved = ["existing"];
  const store = createListStore(
    async () => [...saved],
    async (items) => {
      await Promise.resolve();
      saved = items;
    },
  );
  const firstView = store.update((items) => [...items, "first"]);
  const secondView = store.update((items) => [...items, "second"]);
  await Promise.all([firstView, secondView]);
  assert.deepEqual(saved, ["existing", "first", "second"]);
  assert.deepEqual(store.getSnapshot().items, saved);
});

test("all mounted views are notified after a saved list changes", async () => {
  let saved = ["paper"];
  const store = createListStore(
    async () => [...saved],
    async (items) => {
      saved = items;
    },
  );
  await store.reload();
  const first: string[][] = [],
    second: string[][] = [];
  store.subscribe(() => first.push(store.getSnapshot().items));
  const unsubscribe = store.subscribe(() => second.push(store.getSnapshot().items));
  await store.update(() => []);
  assert.deepEqual(first, [[]]);
  assert.deepEqual(second, [[]]);
  unsubscribe();
});

test("a failed save preserves visible and persisted state and does not block the next save", async () => {
  let saved = ["paper"],
    fail = true;
  const store = createListStore(
    async () => [...saved],
    async (items) => {
      if (fail) throw new Error("disk unavailable");
      saved = items;
    },
  );
  await store.reload();
  await assert.rejects(
    store.update(() => []),
    /disk unavailable/,
  );
  assert.deepEqual(store.getSnapshot().items, ["paper"]);
  assert.deepEqual(saved, ["paper"]);
  fail = false;
  await store.update((items) => [...items, "new"]);
  assert.deepEqual(saved, ["paper", "new"]);
  assert.equal(store.getSnapshot().error, undefined);
});

test("unreadable stored data cannot be replaced with an empty cache", async () => {
  let writes = 0;
  const store = createListStore<string>(
    async () => {
      throw new Error("invalid saved data");
    },
    async () => {
      writes++;
    },
  );
  await assert.rejects(store.reload(), /invalid saved data/);
  await assert.rejects(
    store.update((items) => [...items, "new"]),
    /invalid saved data/,
  );
  assert.equal(writes, 0);
  assert.equal(store.getSnapshot().isLoading, false);
});
