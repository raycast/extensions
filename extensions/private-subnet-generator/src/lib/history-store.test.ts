import { beforeEach, describe, expect, it, vi } from "vitest";
import { HISTORY_KEYS } from "./history";
import { createHistoryStore, HistoryStore } from "./history-store";

const KEY = HISTORY_KEYS.ipv4;

const items = new Map<string, string>();
const delay = () => new Promise((resolve) => setTimeout(resolve, Math.random() * 5));
const storage = {
  getItem: async <T extends string>(key: string) => (await delay(), items.get(key) as T | undefined),
  setItem: async (key: string, value: string) => (await delay(), void items.set(key, value)),
  removeItem: async (key: string) => (await delay(), void items.delete(key)),
};

let store: HistoryStore;

function stored(): string[] | undefined {
  const item = items.get(KEY);
  return item === undefined ? undefined : JSON.parse(item);
}

beforeEach(() => {
  items.clear();
  store = createHistoryStore(storage);
});

describe("history store", () => {
  it("loads an empty history", async () => {
    expect(await store.load(KEY)).toEqual([]);
  });

  it("keeps every value recorded before the load finishes", async () => {
    const loaded = store.load(KEY);
    store.record(KEY, "a", 5);
    store.record(KEY, "b", 5);
    const last = store.record(KEY, "c", 5);
    expect(await loaded).toEqual([]);
    expect(await last).toEqual(["c", "b", "a"]);
  });

  it("has written every value once flushed", async () => {
    store.record(KEY, "a", 5);
    store.record(KEY, "b", 5);
    await store.flush();
    expect(stored()).toEqual(["b", "a"]);
  });

  it("limits the history to the current value and size previous ones", async () => {
    for (const value of ["a", "b", "c", "d"]) store.record(KEY, value, 2);
    await store.flush();
    expect(stored()).toEqual(["d", "c", "b"]);
  });

  it("removes an entry", async () => {
    store.record(KEY, "a", 5);
    store.record(KEY, "b", 5);
    expect(await store.remove(KEY, "a")).toEqual(["b"]);
    expect(stored()).toEqual(["b"]);
  });

  it("clears the history but keeps the given value", async () => {
    store.record(KEY, "a", 5);
    store.record(KEY, "b", 5);
    expect(await store.clear(KEY, "b")).toEqual(["b"]);
    expect(await store.clear(KEY)).toEqual([]);
  });

  it("deletes all histories", async () => {
    store.record(KEY, "a", 5);
    await store.deleteAll();
    expect(stored()).toBeUndefined();
  });

  it("continues after a failed write", async () => {
    const failing = vi.spyOn(storage, "setItem").mockRejectedValueOnce(new Error("full"));
    await expect(store.record(KEY, "a", 5)).rejects.toThrow("full");
    failing.mockRestore();
    expect(await store.record(KEY, "b", 5)).toEqual(["b"]);
  });
});
