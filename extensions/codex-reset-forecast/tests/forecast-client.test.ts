import { describe, expect, it, vi } from "vitest";
import forecast from "./fixtures/forecast-api.json";
import timeline from "./fixtures/timeline-api.json";
import {
  fetchForecast,
  FORECAST_URL,
  TIMELINE_URL,
  USER_AGENT,
  type ForecastSnapshot,
  type ForecastStore,
  type RefreshState,
} from "../src/api/forecast-client";

class MemoryStore implements ForecastStore {
  snapshot?: ForecastSnapshot;
  refresh?: RefreshState;
  writes: ForecastSnapshot[] = [];
  read() {
    return this.snapshot;
  }
  write(snapshot: ForecastSnapshot) {
    this.writes.push(snapshot);
    this.snapshot = snapshot;
  }
  readRefreshState() {
    return this.refresh;
  }
  writeRefreshState(state: RefreshState) {
    this.refresh = state;
  }
}
const start = Date.parse("2026-10-18T03:00:00Z");
const now =
  (seconds = 0) =>
  () =>
    new Date(start + seconds * 1000);
const jsonResponse = (value: unknown, headers?: Record<string, string>) =>
  new Response(JSON.stringify(value), { headers });
function successfulFetch(f = forecast, t = timeline) {
  return vi.fn<typeof fetch>(async (url) => jsonResponse(url === FORECAST_URL ? f : t));
}
async function seed(store: MemoryStore) {
  return fetchForecast({ store, fetchImpl: successfulFetch(), now: now() });
}

describe("fetchForecast", () => {
  it("fetches both public APIs with identifying headers and writes one complete snapshot", async () => {
    const store = new MemoryStore();
    const fetchImpl = successfulFetch();
    const result = await fetchForecast({ store, fetchImpl, now: now() });
    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([FORECAST_URL, TIMELINE_URL]);
    for (const [, options] of fetchImpl.mock.calls) {
      expect(new Headers(options?.headers).get("User-Agent")).toBe(USER_AGENT);
      expect(new Headers(options?.headers).get("x-tsr-serverFn")).toBeNull();
    }
    expect(result.response.forecast?.score48h).toBe(37);
    expect(result.response.history).toHaveLength(78);
    expect(store.writes).toHaveLength(1);
    expect(result.lastSuccessfulRequestAt).toBe(now()().toISOString());
  });
  it("reuses cached data across commands within the one-minute refresh interval", async () => {
    const store = new MemoryStore();
    const saved = await seed(store);
    const fetchImpl = successfulFetch();
    expect(await fetchForecast({ store, fetchImpl, now: now(59) })).toBe(saved);
    expect(fetchImpl).not.toHaveBeenCalled();
    await fetchForecast({ store, fetchImpl, now: now(60) });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it("keeps the snapshot and successful timestamp through repeated failures", async () => {
    const store = new MemoryStore();
    const saved = await seed(store);
    const onCacheFallback = vi.fn();
    for (const seconds of [60, 120, 180]) {
      const result = await fetchForecast({
        store,
        fetchImpl: vi.fn<typeof fetch>().mockRejectedValue(new Error("offline")),
        now: now(seconds),
        onCacheFallback,
      });
      expect(result).toBe(saved);
    }
    expect(store.writes).toHaveLength(1);
    expect(onCacheFallback).toHaveBeenCalledTimes(3);
  });
  it.each([
    () => new Response("unavailable", { status: 404 }),
    () => new Response("<html>broken</html>"),
    () => jsonResponse({ events: [] }),
  ])("does not cache a partial update when the timeline fails", async (failure) => {
    const store = new MemoryStore();
    const saved = await seed(store);
    const fetchImpl = vi.fn<typeof fetch>(async (url) =>
      url === FORECAST_URL
        ? jsonResponse({ ...forecast, probabilities: { ...forecast.probabilities, rounded_24h: 80 } })
        : failure(),
    );
    expect(await fetchForecast({ store, fetchImpl, now: now(60) })).toBe(saved);
    expect(store.writes).toHaveLength(1);
  });
  it.each(["120", "Sun, 18 Oct 2026 03:03:00 GMT"])(
    "persists Retry-After %s and avoids early retries",
    async (retryAfter) => {
      const store = new MemoryStore();
      const fetchImpl = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(null, { status: 429, headers: { "Retry-After": retryAfter } }));
      await expect(fetchForecast({ store, fetchImpl, now: now() })).rejects.toThrow(/rate limiting/);
      await expect(fetchForecast({ store, fetchImpl, now: now(61) })).rejects.toThrow(/rate limiting/);
      expect(fetchImpl).toHaveBeenCalledTimes(2);
      expect(Date.parse(store.refresh!.nextRequestAt)).toBeGreaterThanOrEqual(start + 120_000);
    },
  );
  it("reports an uncached HTTP failure", async () => {
    await expect(
      fetchForecast({
        store: new MemoryStore(),
        fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 500 })),
        now: now(),
      }),
    ).rejects.toThrow("HTTP 500");
  });
  it("aborts a hung request and retains the cache", async () => {
    const store = new MemoryStore();
    const saved = await seed(store);
    const fetchImpl: typeof fetch = (_url, options) =>
      new Promise((_resolve, reject) => options?.signal?.addEventListener("abort", () => reject(new Error("aborted"))));
    expect(await fetchForecast({ store, fetchImpl, now: now(60), timeoutMilliseconds: 5 })).toBe(saved);
    expect(store.refresh?.error).toMatch(/timed out/);
  });
  it.each(["forecast", "timeline"])("does not roll back a newer %s snapshot", async (part) => {
    const store = new MemoryStore();
    const saved = await seed(store);
    const older = "2026-10-17T00:00:00Z";
    const fetchImpl = successfulFetch(
      part === "forecast" ? { ...forecast, updated_at: older } : forecast,
      part === "timeline" ? { ...timeline, updated_at: older } : timeline,
    );
    expect(await fetchForecast({ store, fetchImpl, now: now(60) })).toBe(saved);
    expect(store.writes).toHaveLength(1);
  });
  it("preserves the earliest publication expiry for source freshness warnings", async () => {
    const store = new MemoryStore();
    const expires = "2026-10-18T03:01:00Z";
    const fetchImpl = vi.fn<typeof fetch>(async (url) =>
      jsonResponse(url === FORECAST_URL ? forecast : timeline, {
        "x-published-expires-at": url === FORECAST_URL ? expires : "2026-10-18T03:02:00Z",
      }),
    );
    expect((await fetchForecast({ store, fetchImpl, now: now() })).response.publishedExpiresAt).toBe(
      new Date(expires).toISOString(),
    );
  });
  it("shares an in-flight first load without a spurious uncached cooldown error", async () => {
    const store = new MemoryStore();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const fetchImpl = vi.fn<typeof fetch>(async (url) => {
      await gate;
      return jsonResponse(url === FORECAST_URL ? forecast : timeline);
    });
    const both = Promise.all([
      fetchForecast({ store, fetchImpl, now: now() }),
      fetchForecast({ store, fetchImpl, now: now() }),
    ]);
    release();
    const [first, second] = await both;
    expect(first).toBe(second);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it("waits for the first snapshot shared by a separate command runtime without refetching", async () => {
    const store = new MemoryStore();
    // Separate command runtimes have distinct store objects backed by the same Raycast cache.
    const otherStore: ForecastStore = {
      read: () => store.read(),
      write: (snapshot) => store.write(snapshot),
      readRefreshState: () => store.readRefreshState(),
      writeRefreshState: (state) => store.writeRefreshState(state),
    };
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const fetchImpl = vi.fn<typeof fetch>(async (url) => {
      await gate;
      return jsonResponse(url === FORECAST_URL ? forecast : timeline);
    });
    const both = Promise.all([
      fetchForecast({ store, fetchImpl, now: now() }),
      fetchForecast({ store: otherStore, fetchImpl, now: now() }),
    ]);
    release();
    const [first, second] = await both;
    expect(second).toBe(first);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it("reports a first-load failure published by another command without refetching", async () => {
    vi.useFakeTimers();
    try {
      const store = new MemoryStore();
      store.refresh = { nextRequestAt: now(60)().toISOString() };
      const fetchImpl = successfulFetch();
      const result = fetchForecast({ store, fetchImpl, now: now(), timeoutMilliseconds: 1000 });
      const failure = expect(result).rejects.toThrow("HTTP 500");
      store.refresh = { ...store.refresh, error: "codex-reset.com returned HTTP 500." };
      await vi.advanceTimersByTimeAsync(100);
      await failure;
      expect(fetchImpl).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
  it("bounds the first-load wait if another command exits before saving data", async () => {
    vi.useFakeTimers();
    try {
      const store = new MemoryStore();
      store.refresh = { nextRequestAt: now(60)().toISOString() };
      const fetchImpl = successfulFetch();
      const result = fetchForecast({ store, fetchImpl, now: now(), timeoutMilliseconds: 250 });
      const failure = expect(result).rejects.toThrow(/one refresh per minute/);
      await vi.advanceTimersByTimeAsync(250);
      await failure;
      expect(fetchImpl).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
  it("honours a rate limit even when the other endpoint has a network error", async () => {
    const store = new MemoryStore();
    const fetchImpl = vi.fn<typeof fetch>(async (url) => {
      if (url === FORECAST_URL) throw new Error("offline");
      return new Response(null, { status: 429, headers: { "Retry-After": "300" } });
    });
    await expect(fetchForecast({ store, fetchImpl, now: now() })).rejects.toThrow(/rate limiting/);
    expect(Date.parse(store.refresh!.nextRequestAt)).toBe(start + 300_000);
  });
});
