import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchLeaderboard, LeaderboardError, type FetchResult } from "../src/lib/api";
import { CACHE_TTL_MS, credentialCacheKey, isFresh, LeaderboardService, type CacheStore } from "../src/lib/cache";
import { apiModel, NOW, page, snapshot } from "./fixtures";

class MemoryCache implements CacheStore {
  entries = new Map<string, string>();
  get(key: string) {
    return this.entries.get(key);
  }
  set(key: string, value: string) {
    this.entries.set(key, value);
  }
  remove(key: string) {
    this.entries.delete(key);
  }
}

describe("leaderboard cache", () => {
  let cache: MemoryCache;
  beforeEach(() => {
    cache = new MemoryCache();
  });

  it("scopes snapshots by hashed credentials and never persists keys", async () => {
    const loader = vi.fn().mockResolvedValue({ snapshot: snapshot() });
    const first = new LeaderboardService("test-key-not-real", cache, { loader, now: () => NOW });
    await first.refresh();
    expect(first.readSnapshot()).toEqual(snapshot());
    expect(new LeaderboardService("different-key", cache).readSnapshot()).toBeUndefined();
    expect(JSON.stringify([...cache.entries])).not.toContain("test-key-not-real");
    expect(credentialCacheKey(" test-key-not-real ")).toBe(credentialCacheKey("test-key-not-real"));
  });

  it("uses cached results for one hour, refreshing at the exact expiry", async () => {
    let now = NOW;
    const loader = vi.fn().mockImplementation(async () => ({ snapshot: snapshot({ fetchedAt: now }) }));
    const service = new LeaderboardService("key", cache, { loader, now: () => now });
    await service.refresh();
    now += CACHE_TTL_MS - 1;
    await service.refresh();
    expect(loader).toHaveBeenCalledTimes(1);
    now += 1;
    await service.refresh();
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("does not consider future retrieval times fresh", () => {
    expect(isFresh(snapshot({ fetchedAt: NOW + 1 }), NOW)).toBe(false);
  });

  it("invalidates older model snapshots while preserving their rate-limit cooldown", async () => {
    cache.set(credentialCacheKey("key", 1), JSON.stringify(snapshot()));
    cache.set(`${credentialCacheKey("key", 1)}:retry-at`, String(NOW + 60_000));
    const loader = vi.fn();
    const service = new LeaderboardService("key", cache, { loader, now: () => NOW });
    expect(service.readSnapshot()).toBeUndefined();
    await expect(service.refresh(true)).rejects.toMatchObject({ kind: "rate-limit", retryAt: NOW + 60_000 });
    expect(loader).not.toHaveBeenCalled();
  });

  it("allows a manual refresh to bypass freshness", async () => {
    const loader = vi.fn().mockResolvedValue({ snapshot: snapshot() });
    const service = new LeaderboardService("key", cache, { loader, now: () => NOW });
    await service.refresh();
    await service.refresh(true);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("deduplicates concurrent refreshes", async () => {
    let finish!: (value: FetchResult) => void;
    const loader = vi.fn().mockImplementation(
      () =>
        new Promise<FetchResult>((resolve) => {
          finish = resolve;
        }),
    );
    const service = new LeaderboardService("key", cache, { loader, now: () => NOW });
    const first = service.refresh();
    const second = service.refresh(true);
    expect(second).toBe(first);
    finish({ snapshot: snapshot() });
    await first;
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("preserves the last complete dataset if a later page fails", async () => {
    cache.set(credentialCacheKey("key"), JSON.stringify(snapshot({ fetchedAt: NOW - CACHE_TTL_MS })));
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(page([apiModel("new")], 1, 2)))
      .mockResolvedValueOnce(new Response(null, { status: 500 }));
    const service = new LeaderboardService("key", cache, {
      now: () => NOW,
      loader: () => fetchLeaderboard("key", { fetcher, now: () => NOW }),
    });
    const previous = service.readSnapshot();
    await expect(service.refresh()).rejects.toMatchObject({ kind: "server" });
    expect(service.readSnapshot()).toEqual(previous);
  });

  it("persists rate limits across command openings and refuses early manual refreshes", async () => {
    let now = NOW;
    const retryAt = NOW + 60_000;
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new LeaderboardError("rate-limit", "Limit reached", retryAt))
      .mockResolvedValue({ snapshot: snapshot() });
    const service = new LeaderboardService("key", cache, { loader, now: () => now });
    await expect(service.refresh()).rejects.toMatchObject({ retryAt });
    const reopened = new LeaderboardService("key", cache, { loader, now: () => now });
    await expect(reopened.refresh(true)).rejects.toMatchObject({ retryAt });
    expect(loader).toHaveBeenCalledTimes(1);
    now = retryAt;
    await reopened.refresh(true);
    expect(loader).toHaveBeenCalledTimes(2);
    expect(reopened.getRetryAt()).toBeUndefined();
  });

  it("caches a successful response with no remaining quota", async () => {
    const loader = vi.fn().mockResolvedValue({ snapshot: snapshot(), retryAt: NOW + 60_000 });
    const service = new LeaderboardService("key", cache, { loader, now: () => NOW });
    await service.refresh();
    expect(service.readSnapshot()).toEqual(snapshot());
    await service.refresh();
    await expect(service.refresh(true)).rejects.toMatchObject({ kind: "rate-limit" });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it.each([
    "not json",
    JSON.stringify({ models: [] }),
    JSON.stringify({ ...snapshot(), models: [{ ...snapshot().models[0], intelligence: "50" }] }),
  ])("ignores a corrupt cache and recovers by fetching", async (raw) => {
    cache.set(credentialCacheKey("key"), raw);
    const loader = vi.fn().mockResolvedValue({ snapshot: snapshot() });
    const service = new LeaderboardService("key", cache, { loader, now: () => NOW });
    expect(service.readSnapshot()).toBeUndefined();
    expect(await service.refresh()).toEqual(snapshot());
  });

  it("does not save results after cancellation", async () => {
    const controller = new AbortController();
    const service = new LeaderboardService("key", cache, {
      loader: async () => {
        controller.abort();
        return { snapshot: snapshot() };
      },
    });
    await expect(service.refresh(false, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(service.readSnapshot()).toBeUndefined();
  });

  it("lets a reopened command fetch while a canceled request is still settling", async () => {
    let finishFirst!: (result: FetchResult) => void;
    let finishSecond!: (result: FetchResult) => void;
    const loader = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<FetchResult>((resolve) => {
            finishFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<FetchResult>((resolve) => {
            finishSecond = resolve;
          }),
      );
    const service = new LeaderboardService("key", cache, { loader, now: () => NOW });
    const firstController = new AbortController();
    const first = service.refresh(false, firstController.signal);
    const canceled = expect(first).rejects.toMatchObject({ name: "AbortError" });
    firstController.abort();

    const second = service.refresh(false, new AbortController().signal);
    expect(second).not.toBe(first);
    expect(loader).toHaveBeenCalledTimes(2);
    finishFirst({ snapshot: snapshot({ indexVersion: 4.1 }) });
    await canceled;
    expect(service.readSnapshot()).toBeUndefined();
    expect(service.refresh(true)).toBe(second);

    finishSecond({ snapshot: snapshot() });
    expect(await second).toEqual(snapshot());
    expect(service.readSnapshot()).toEqual(snapshot());
  });
});
