import { describe, expect, it, vi } from "vitest";
import { LeaderboardError } from "../src/lib/api";
import { CACHE_TTL_MS } from "../src/lib/cache";
import { LeaderboardStore } from "../src/lib/leaderboard-store";
import type { LeaderboardSnapshot } from "../src/lib/models";
import { NOW, snapshot } from "./fixtures";

function fakeService(cached?: LeaderboardSnapshot) {
  let finish!: (value: LeaderboardSnapshot) => void;
  let fail!: (error: unknown) => void;
  const refresh = vi.fn((_force?: boolean, signal?: AbortSignal) => {
    return new Promise<LeaderboardSnapshot>((resolve, reject) => {
      finish = resolve;
      fail = reject;
      signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    });
  });
  return {
    service: { readSnapshot: () => cached, refresh },
    refresh,
    finish: (value: LeaderboardSnapshot) => finish(value),
    fail: (error: unknown) => fail(error),
  };
}

describe("shared leaderboard store", () => {
  it("shares one fetch between screens and shows its result on all of them", async () => {
    const fake = fakeService();
    const store = new LeaderboardStore(fake.service, () => NOW);
    const listener = vi.fn();
    store.subscribe(listener);
    const dashboard = store.refresh(false);
    const pushedList = store.refresh(false);
    expect(fake.refresh).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().isLoading).toBe(true);
    fake.finish(snapshot());
    expect(await dashboard).toEqual({ status: "updated", snapshot: snapshot() });
    expect(await pushedList).toEqual({ status: "updated", snapshot: snapshot() });
    expect(store.getSnapshot()).toEqual({ snapshot: snapshot(), isLoading: false });
    expect(listener).toHaveBeenCalled();
  });

  it("keeps a fresh snapshot without fetching, but refreshes on request", async () => {
    const fake = fakeService(snapshot());
    const store = new LeaderboardStore(fake.service, () => NOW + 1000);
    expect(store.getSnapshot().isLoading).toBe(false);
    await store.refresh(false);
    expect(fake.refresh).not.toHaveBeenCalled();
    const manual = store.refresh(true);
    fake.finish(snapshot({ fetchedAt: NOW + 1000 }));
    expect(await manual).toMatchObject({ status: "updated" });
    expect(store.getSnapshot().snapshot?.fetchedAt).toBe(NOW + 1000);
  });

  it("cancels an unfinished fetch only when the last screen closes", async () => {
    const fake = fakeService(snapshot({ fetchedAt: NOW - CACHE_TTL_MS }));
    const store = new LeaderboardStore(fake.service, () => NOW);
    expect(store.getSnapshot().isLoading).toBe(true);
    const releaseDashboard = store.retain();
    const releaseList = store.retain();
    const pending = store.refresh(false);
    releaseList();
    releaseList();
    expect(fake.refresh.mock.calls[0][1]?.aborted).toBe(false);
    releaseDashboard();
    expect(await pending).toEqual({ status: "cancelled" });
    expect(store.getSnapshot()).toMatchObject({
      isLoading: false,
      snapshot: snapshot({ fetchedAt: NOW - CACHE_TTL_MS }),
    });
    store.retain();
    void store.refresh(false);
    expect(fake.refresh).toHaveBeenCalledTimes(2);
  });

  it("shares failures, keeping the last data and the retry time", async () => {
    const fake = fakeService(snapshot({ fetchedAt: NOW - CACHE_TTL_MS }));
    const store = new LeaderboardStore(fake.service, () => NOW);
    const pending = store.refresh(true);
    fake.fail(new LeaderboardError("rate-limit", "Limit reached.", NOW + 60_000));
    expect(await pending).toEqual({
      status: "failed",
      error: { kind: "rate-limit", message: "Limit reached.", retryAt: NOW + 60_000 },
    });
    expect(store.getSnapshot()).toMatchObject({
      isLoading: false,
      error: { kind: "rate-limit" },
      snapshot: snapshot({ fetchedAt: NOW - CACHE_TTL_MS }),
    });
  });
});
