import { describe, expect, it, vi } from "vitest";
import { QueryCache } from "./query-cache";

function setup() {
  const entries = new Map<string, string>();
  const storage = {
    get: (key: string) => entries.get(key),
    set: (key: string, value: string) => {
      entries.set(key, value);
    },
    remove: (key: string) => entries.delete(key),
    clear: () => entries.clear(),
  };
  let time = 1000;
  const now = () => time;
  return {
    entries,
    storage,
    now,
    cache: new QueryCache(storage, now),
    advance: (ms: number) => {
      time += ms;
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("QueryCache", () => {
  it("reuses fresh data and fetches again at the TTL boundary", async () => {
    const { cache, advance } = setup();
    const loader = vi.fn().mockResolvedValueOnce(["first"]).mockResolvedValueOnce(["second"]);
    await cache.fetch("recent", 100, loader);
    advance(99);
    expect(await cache.fetch("recent", 100, loader)).toEqual(["first"]);
    expect(loader).toHaveBeenCalledTimes(1);
    advance(1);
    expect(await cache.fetch("recent", 100, loader)).toEqual(["second"]);
  });

  it("hydrates data from storage in another instance", async () => {
    const { cache, storage, now } = setup();
    await cache.fetch("timer", 100, async () => null);
    const reopened = new QueryCache(storage, now);
    expect(reopened.read("timer")).toEqual({ data: null, updatedAt: 1000 });
    const loader = vi.fn();
    expect(await reopened.fetch("timer", 100, loader)).toBeNull();
    expect(loader).not.toHaveBeenCalled();
  });

  it.each([
    "broken json",
    "null",
    "{}",
    JSON.stringify({ version: 2, updatedAt: 1000, data: [] }),
    JSON.stringify({ version: 1, updatedAt: "1000", data: [] }),
    JSON.stringify({ version: 1, updatedAt: 1001, data: [] }),
    JSON.stringify({ version: 1, updatedAt: 1000 }),
  ])("discards malformed or incompatible entry %s", (raw) => {
    const { cache, entries } = setup();
    entries.set("recent", raw);
    expect(cache.read("recent")).toBeUndefined();
    expect(entries.has("recent")).toBe(false);
  });

  it("expires persistent data after one day", async () => {
    const { cache, advance, entries } = setup();
    await cache.fetch("recent", 100, async () => []);
    advance(24 * 60 * 60 * 1000);
    expect(cache.read("recent")).toBeUndefined();
    expect(entries.has("recent")).toBe(false);
  });

  it("deduplicates simultaneous requests, including forced refreshes", async () => {
    const { cache } = setup();
    const pending = deferred<string>();
    const loader = vi.fn(() => pending.promise);
    const first = cache.fetch("recent", 100, loader);
    const second = cache.fetch("recent", 100, loader, true);
    pending.resolve("loaded");
    expect(await Promise.all([first, second])).toEqual(["loaded", "loaded"]);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(await cache.fetch("recent", 100, async () => "forced", true)).toBe("forced");
  });

  it("prevents a pre-invalidation request overwriting newer data", async () => {
    const { cache } = setup();
    const old = deferred<string>();
    const first = cache.fetch("timer", 100, () => old.promise);
    cache.invalidate("timer");
    expect(cache.read("timer")).toBeUndefined();
    expect(await cache.fetch("timer", 100, async () => "new")).toBe("new");
    old.resolve("old");
    expect(await first).toBe("old");
    expect(cache.read("timer")?.data).toBe("new");
  });

  it("keeps the replacement request deduplicated when an invalidated request finishes", async () => {
    const { cache } = setup();
    const old = deferred<string>();
    const next = deferred<string>();
    const first = cache.fetch("timer", 100, () => old.promise);
    cache.invalidate("timer");
    const second = cache.fetch("timer", 100, () => next.promise);
    old.resolve("old");
    await first;
    const loader = vi.fn(async () => "unexpected");
    const third = cache.fetch("timer", 100, loader);
    next.resolve("new");
    expect(await Promise.all([second, third])).toEqual(["new", "new"]);
    expect(loader).not.toHaveBeenCalled();
  });

  it("preserves cached data on fetch failure and allows retry", async () => {
    const { cache } = setup();
    await cache.fetch("recent", 100, async () => "old");
    await expect(
      cache.fetch(
        "recent",
        100,
        async () => {
          throw new Error("offline");
        },
        true,
      ),
    ).rejects.toThrow("offline");
    expect(cache.read("recent")?.data).toBe("old");
    expect(await cache.fetch("recent", 100, async () => "new", true)).toBe("new");
  });

  it("returns network data even when persistence fails", async () => {
    const cache = new QueryCache({
      get: () => {
        throw new Error("unavailable");
      },
      set: () => {
        throw new Error("unavailable");
      },
      remove: () => {
        throw new Error("unavailable");
      },
      clear: () => {},
    });
    expect(cache.read("recent")).toBeUndefined();
    expect(await cache.fetch("recent", 100, async () => [])).toEqual([]);
  });

  it("clears persisted keys and blocks all outstanding writes", async () => {
    const { cache, entries } = setup();
    entries.set("previous-session-key", "old");
    const pending = deferred<string>();
    const request = cache.fetch("timer", 100, () => pending.promise);
    cache.invalidateAll();
    pending.resolve("stale");
    await request;
    expect(entries.size).toBe(0);
  });

  it("seeds confirmed data without letting an older request overwrite it", async () => {
    const { cache } = setup();
    const pending = deferred<string>();
    const request = cache.fetch("timer", 100, () => pending.promise);
    cache.write("timer", "confirmed");
    pending.resolve("stale");
    await request;
    expect(cache.read("timer")?.data).toBe("confirmed");
  });
});
