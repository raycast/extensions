import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../src/lib/api";
import { keyFingerprint } from "../src/lib/auth";
import { UsageCache } from "../src/lib/cache";
import { collect, type CollectorDeps } from "../src/lib/collector";
import type { Payload, PricingCatalog, PricingModel, Usage } from "../src/lib/types";
import { MemoryStorage } from "./helpers/memory-storage";

const NOW = new Date("2026-09-08T10:00:00Z");

const USAGE: Usage = {
  rolling: { status: "ok", percent: 42, resetsAt: "2026-09-08T11:00:00Z" },
  weekly: { status: "ok", percent: 31, resetsAt: "2026-09-12T16:00:00Z" },
  monthly: { status: "ok", percent: 18, resetsAt: "2026-10-04T00:00:00Z" },
};

const PRICING: PricingCatalog = {
  go: [
    { id: "a", cost: { input: 0.22, output: 0.66, cacheRead: 0.007 }, modalities: { input: ["text"], output: ["text"] } },
    { id: "b", cost: { input: 0.1, output: 0.3, cacheRead: 0.02 }, modalities: null },
  ],
  zen: [{ id: "z", cost: { input: 0.14, output: 0.28, cacheRead: 0.028 }, modalities: null }],
};

const PRICE_FALLBACK = { input: 0.5, output: 2, cacheRead: 0 };

function buildDeps(overrides: Partial<CollectorDeps> = {}): CollectorDeps & { storage: MemoryStorage } {
  const storage = new MemoryStorage();
  const cache = new UsageCache(storage);
  return {
    resolveKey: vi.fn(async () => "key"),
    fetchUsage: vi.fn(async () => USAGE),
    fetchGoCatalog: vi.fn(async () => ["a", "b", "c"]),
    fetchZenCatalog: vi.fn(async () => ["z"]),
    fetchPricing: vi.fn(async () => PRICING),
    cache,
    now: vi.fn(() => NOW),
    storage,
    ...overrides,
  };
}

describe("collect", () => {
  it("assembles a fresh payload with quota and picks", async () => {
    const deps = buildDeps();
    const result = await collect(deps);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.fromCache).toBe(false);
    expect(result.payload.offline).toBe(false);
    expect(result.payload.models.go.map((m) => m.id)).toEqual(["a", "b", "c"]);
    const a = result.payload.models.go.find((m) => m.id === "a");
    expect(a?.quota).toBe(13670);
    expect(a?.modalities?.input).toEqual(["text"]);
    // a is the highest quota model; picks = stretch a, best b
    expect(result.payload.picks.stretch).toBe("a");
    expect(result.payload.picks.bestValue).toBe("b");
    expect(result.payload.picks.computedAt).toBe(NOW.toISOString());
    expect(result.payload.models.go.find((m) => m.id === "a")?.isPick).toBe("stretch");
    expect(deps.storage.getItem("ocg.lastPayload.v2")).toBeTruthy();
  });

  it("builds the Zen catalog with no quota or picks", async () => {
    const deps = buildDeps();
    const result = await collect(deps);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.models.zen.map((m) => m.id)).toEqual(["z"]);
    const z = result.payload.models.zen[0];
    expect(z.quota).toBeNull();
    expect(z.isPick).toBeNull();
    expect(z.cost?.input).toBe(0.14);
  });

  it("returns the Go catalog sorted by quota descending, unpriced last", async () => {
    const deps = buildDeps({ fetchGoCatalog: vi.fn(async () => ["c", "b", "a", "noprice"]) });
    const result = await collect(deps);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.models.go.map((m) => m.id)).toEqual(["a", "b", "c", "noprice"]);
    expect(result.payload.models.go[3].quota).toBeNull();
  });

  it("fails with no-key and ignores the cache", async () => {
    const deps = buildDeps({ resolveKey: vi.fn(async () => null) });
    const result = await collect(deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.type).toBe("no-key");
  });

  it("fails with bad-key on a 401", async () => {
    const deps = buildDeps({ fetchUsage: vi.fn(async () => { throw new ApiError("bad-key", "Go key invalid (401)"); }) });
    const result = await collect(deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.type).toBe("bad-key");
  });

  it("fails with no-entitlement on a 403", async () => {
    const deps = buildDeps({ fetchUsage: vi.fn(async () => { throw new ApiError("no-entitlement", "OpenCode Go subscription required (403)"); }) });
    const result = await collect(deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.type).toBe("no-entitlement");
  });

  it("fails offline when there is no last-known data", async () => {
    const deps = buildDeps({ fetchUsage: vi.fn(async () => { throw new ApiError("offline", "Network request failed"); }) });
    const result = await collect(deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.type).toBe("offline");
  });

  it("fails with service on an HTTP error without serving stale data", async () => {
    const storage = new MemoryStorage();
    const cache = new UsageCache(storage);
    const prev: Payload = { windows: USAGE, models: { go: [], zen: [] }, picks: { stretch: null, bestValue: null, computedAt: NOW.toISOString() }, updatedAt: new Date(NOW.getTime() - 30_000).toISOString(), offline: false };
    cache.writeLastPayload(prev, keyFingerprint("key"));
    const deps = buildDeps({ cache, fetchUsage: vi.fn(async () => { throw new ApiError("http", "HTTP 500"); }) });
    const result = await collect(deps, { force: true });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.type).toBe("service");
  });

  it("serves last-known data marked offline when the network fails", async () => {
    const storage = new MemoryStorage();
    const cache = new UsageCache(storage);
    const prev: Payload = { windows: USAGE, models: { go: [], zen: [] }, picks: { stretch: null, bestValue: null, computedAt: NOW.toISOString() }, updatedAt: new Date(NOW.getTime() - 70_000).toISOString(), offline: false };
    cache.writeLastPayload(prev, keyFingerprint("key"));
    const deps = buildDeps({
      cache,
      fetchUsage: vi.fn(async () => { throw new ApiError("offline", "Network request failed"); }),
    });
    const result = await collect(deps);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.fromCache).toBe(true);
    expect(result.payload.offline).toBe(true);
    expect(result.payload.windows).toEqual(USAGE);
  });

  it("reuses warm pricing without refetching", async () => {
    const storage = new MemoryStorage();
    const cache = new UsageCache(storage);
    cache.writePricing(PRICING, new Date(NOW.getTime() - 23 * 3600_000).toISOString());
    const fetchPricing = vi.fn(async () => PRICING);
    const deps = buildDeps({ cache, fetchPricing });
    await collect(deps);
    expect(fetchPricing).not.toHaveBeenCalled();
  });

  it("refetches pricing when the 24h TTL has expired", async () => {
    const storage = new MemoryStorage();
    const cache = new UsageCache(storage);
    cache.writePricing(PRICING, new Date(NOW.getTime() - 25 * 3600_000).toISOString());
    const fetchPricing = vi.fn(async () => PRICING);
    const deps = buildDeps({ cache, fetchPricing });
    await collect(deps);
    expect(fetchPricing).toHaveBeenCalledTimes(1);
    expect(cache.readPricing()?.fetchedAt).toBe(NOW.toISOString());
  });

  it("falls back to catalog ids from the last payload when a catalog fetch fails", async () => {
    const storage = new MemoryStorage();
    const cache = new UsageCache(storage);
    const prev: Payload = { windows: USAGE, models: { go: [{ id: "old", cost: PRICE_FALLBACK, modalities: null, quota: 10, isPick: null }], zen: [] }, picks: { stretch: null, bestValue: null, computedAt: NOW.toISOString() }, updatedAt: NOW.toISOString(), offline: false };
    cache.writeLastPayload(prev, keyFingerprint("key"));
    const deps = buildDeps({ cache, fetchGoCatalog: vi.fn(async () => { throw new Error("boom"); }) });
    const result = await collect(deps);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.models.go.map((m) => m.id)).toContain("old");
  });

  it("falls back to cached Zen ids when the Zen catalog fetch fails", async () => {
    const storage = new MemoryStorage();
    const cache = new UsageCache(storage);
    const prev: Payload = { windows: USAGE, models: { go: [], zen: [{ id: "zcached", cost: PRICE_FALLBACK, modalities: null, quota: null, isPick: null }] }, picks: { stretch: null, bestValue: null, computedAt: NOW.toISOString() }, updatedAt: NOW.toISOString(), offline: false };
    cache.writeLastPayload(prev, keyFingerprint("key"));
    const deps = buildDeps({ cache, fetchZenCatalog: vi.fn(async () => { throw new Error("boom"); }) });
    const result = await collect(deps);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.models.zen.map((m) => m.id)).toContain("zcached");
  });

  it("reuses today's picks instead of recomputing", async () => {
    const storage = new MemoryStorage();
    const cache = new UsageCache(storage);
    const picks = { stretch: "a", bestValue: "b", computedAt: new Date(NOW.getTime() - 3600_000).toISOString() };
    const prev: Payload = { windows: USAGE, models: { go: [], zen: [] }, picks, updatedAt: new Date(NOW.getTime() - 70_000).toISOString(), offline: false };
    cache.writeLastPayload(prev, keyFingerprint("key"));
    cache.setPicksComputedAt(picks.computedAt);
    const deps = buildDeps({ cache });
    const result = await collect(deps);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.picks).toEqual(picks);
    expect(result.payload.models.go.find((m) => m.id === "a")?.isPick).toBe("stretch");
    expect(result.payload.models.go.find((m) => m.id === "b")?.isPick).toBe("best-value");
  });

  it("recomputes picks when the daily window has lapsed", async () => {
    const storage = new MemoryStorage();
    const cache = new UsageCache(storage);
    cache.setPicksComputedAt(new Date(NOW.getTime() - 25 * 3600_000).toISOString());
    const deps = buildDeps({ cache });
    const result = await collect(deps);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.picks.computedAt).toBe(NOW.toISOString());
    expect(result.payload.picks.stretch).toBe("a");
  });

  it("serves a warm cached payload without fetching when not forced", async () => {
    const storage = new MemoryStorage();
    const cache = new UsageCache(storage);
    cache.writeLastPayload({
      windows: USAGE,
      models: { go: [], zen: [] },
      picks: { stretch: null, bestValue: null, computedAt: NOW.toISOString() },
      updatedAt: new Date(NOW.getTime() - 30_000).toISOString(),
      offline: false,
    }, keyFingerprint("key"));
    const fetchUsage = vi.fn(async () => USAGE);
    const deps = buildDeps({ cache, fetchUsage });
    const result = await collect(deps, { force: false });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.fromCache).toBe(true);
    expect(fetchUsage).not.toHaveBeenCalled();
  });

  it("ignores the cache when the API key changes", async () => {
    const storage = new MemoryStorage();
    const cache = new UsageCache(storage);
    cache.writeLastPayload({
      windows: USAGE,
      models: { go: [], zen: [] },
      picks: { stretch: null, bestValue: null, computedAt: NOW.toISOString() },
      updatedAt: new Date(NOW.getTime() - 30_000).toISOString(),
      offline: false,
    }, keyFingerprint("old-key"));
    const fetchUsage = vi.fn(async () => USAGE);
    const deps = buildDeps({
      cache,
      resolveKey: vi.fn(async () => "new-key"),
      fetchUsage,
    });
    const result = await collect(deps, { force: false });
    expect(result.ok).toBe(true);
    expect(fetchUsage).toHaveBeenCalledTimes(1);
    expect(cache.readKeyScope()).toBe(keyFingerprint("new-key"));
  });

  it("refetches when forced even with a warm cache", async () => {
    const storage = new MemoryStorage();
    const cache = new UsageCache(storage);
    cache.writeLastPayload({
      windows: USAGE,
      models: { go: [], zen: [] },
      picks: { stretch: null, bestValue: null, computedAt: NOW.toISOString() },
      updatedAt: new Date(NOW.getTime() - 30_000).toISOString(),
      offline: false,
    }, keyFingerprint("key"));
    const fetchUsage = vi.fn(async () => USAGE);
    const deps = buildDeps({ cache, fetchUsage });
    await collect(deps, { force: true });
    expect(fetchUsage).toHaveBeenCalledTimes(1);
  });

  it("refetches a stale cache without forcing", async () => {
    const storage = new MemoryStorage();
    const cache = new UsageCache(storage);
    cache.writeLastPayload({
      windows: USAGE,
      models: { go: [], zen: [] },
      picks: { stretch: null, bestValue: null, computedAt: NOW.toISOString() },
      updatedAt: new Date(NOW.getTime() - 70_000).toISOString(),
      offline: false,
    }, keyFingerprint("key"));
    const fetchUsage = vi.fn(async () => USAGE);
    const deps = buildDeps({ cache, fetchUsage });
    await collect(deps, { force: false });
    expect(fetchUsage).toHaveBeenCalledTimes(1);
  });
});