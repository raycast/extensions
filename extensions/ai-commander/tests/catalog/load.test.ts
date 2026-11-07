import { describe, expect, it, vi } from "vitest";
import { CACHE_VERSION, createCatalogStore, type StringCache } from "../../src/catalog/cache";
import { createCatalogLoader, STALE_AFTER_MS, type ModelFetcher } from "../../src/catalog/load";
import type { RawModel } from "../../src/core/types";

class MemoryCache implements StringCache {
  readonly data = new Map<string, string>();
  get(key: string) {
    return this.data.get(key);
  }
  set(key: string, value: string) {
    this.data.set(key, value);
  }
}

const SECRET = "sk-supersecretkey123456";

function setup(lists: Record<string, RawModel[] | Error>) {
  const cache = new MemoryCache();
  let time = 1_000_000;
  const fetchModels = vi.fn<ModelFetcher>(async (provider) => {
    const result = lists[provider];
    if (result instanceof Error) throw result;
    return result ?? [];
  });
  const load = createCatalogLoader({ fetchModels, store: createCatalogStore(cache), now: () => time });
  return { cache, fetchModels, load, advance: (ms: number) => (time += ms) };
}

const keys = { openai: "k1", openrouter: "k2" };

describe("loadCatalog", () => {
  it("fetches all providers with keys and skips those without", async () => {
    const { load, fetchModels } = setup({ openai: [{ id: "gpt-a" }], openrouter: [{ id: "qwen/q" }] });
    const result = await load({ keys: { ...keys, gemini: "" } });
    expect(fetchModels.mock.calls.map((c) => c[0]).sort()).toEqual(["openai", "openrouter"]);
    expect(result.entries.map((e) => e.ref.modelId)).toEqual(["gpt-a", "qwen/q"]);
    expect(result.errors).toEqual({});
  });

  it("uses the cache within 24 h and refetches afterwards", async () => {
    const { load, fetchModels, advance } = setup({ openai: [{ id: "gpt-a" }] });
    await load({ keys: { openai: "k" } });
    advance(STALE_AFTER_MS - 1);
    const cached = await load({ keys: { openai: "k" } });
    expect(fetchModels).toHaveBeenCalledTimes(1);
    expect(cached.entries).toHaveLength(1);
    expect(cached.refreshed).toEqual([]);
    advance(1);
    await load({ keys: { openai: "k" } });
    expect(fetchModels).toHaveBeenCalledTimes(2);
  });

  it("force refresh ignores freshness", async () => {
    const { load, fetchModels } = setup({ openai: [{ id: "gpt-a" }] });
    await load({ keys: { openai: "k" } });
    await load({ keys: { openai: "k" }, force: true });
    expect(fetchModels).toHaveBeenCalledTimes(2);
  });

  it("keeps cached entries of a failing provider and reports it without leaking the key", async () => {
    const lists: Record<string, RawModel[] | Error> = { openai: [{ id: "gpt-a" }], openrouter: [{ id: "qwen/q" }] };
    const { load, fetchModels, advance } = setup(lists);
    await load({ keys });
    advance(STALE_AFTER_MS);
    lists["openrouter"] = new Error(`401 for Bearer ${SECRET}`);
    lists["openai"] = [{ id: "gpt-b" }];
    const result = await load({ keys });
    expect(result.entries.map((e) => e.ref.modelId)).toEqual(["gpt-b", "qwen/q"]);
    expect(result.errors.openrouter).toBeDefined();
    expect(result.errors.openrouter).not.toContain(SECRET);
    expect(result.errors.openai).toBeUndefined();
    // The failed provider is retried on the next call because its timestamp did not advance.
    await load({ keys });
    expect(fetchModels.mock.calls.filter((c) => c[0] === "openrouter")).toHaveLength(3);
  });

  it("returns an empty catalog with an error when the first load fails", async () => {
    const { load } = setup({ openai: new Error("offline") });
    const result = await load({ keys: { openai: "k" } });
    expect(result.entries).toEqual([]);
    expect(result.errors.openai).toBe("offline");
  });

  it("drops entries of providers whose key was removed", async () => {
    const { load } = setup({ openai: [{ id: "gpt-a" }], openrouter: [{ id: "qwen/q" }] });
    await load({ keys });
    const result = await load({ keys: { openai: "k1" } });
    expect(result.entries.map((e) => e.ref.modelId)).toEqual(["gpt-a"]);
  });

  it("dedupes concurrent calls", async () => {
    const { load, fetchModels } = setup({ openai: [{ id: "gpt-a" }] });
    const [a, b] = await Promise.all([load({ keys: { openai: "k" } }), load({ keys: { openai: "k" } })]);
    expect(fetchModels).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it("survives a corrupted cache", async () => {
    const { load, cache, fetchModels } = setup({ openai: [{ id: "gpt-a" }] });
    cache.set("catalog", "{not json");
    const result = await load({ keys: { openai: "k" } });
    expect(fetchModels).toHaveBeenCalledTimes(1);
    expect(result.entries).toHaveLength(1);
  });
});

describe("catalog store", () => {
  it("ignores unknown versions and invalid entries", () => {
    const cache = new MemoryCache();
    const store = createCatalogStore(cache);
    cache.set("catalog", JSON.stringify({ version: 99, entries: [], fetchedAt: {} }));
    expect(store.read()).toEqual({ entries: [], fetchedAt: {} });
    cache.set(
      "catalog",
      JSON.stringify({
        version: CACHE_VERSION,
        entries: [{ ref: { provider: "openai", modelId: "a" }, displayName: "A", family: "GPT" }, { ref: 1 }, null],
        fetchedAt: { openai: 5, gemini: "x", bogus: 1 },
      }),
    );
    const snapshot = store.read();
    expect(snapshot.entries).toHaveLength(1);
    expect(snapshot.fetchedAt).toEqual({ openai: 5 });
  });

  it("round-trips through the default Raycast Cache", () => {
    const store = createCatalogStore();
    store.write({ entries: [], fetchedAt: { openai: 1 } });
    expect(store.read().fetchedAt).toEqual({ openai: 1 });
  });
});
