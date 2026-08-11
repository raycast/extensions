import { describe, expect, it, vi } from "vitest";
import validFixture from "./fixtures/forecast-valid.json";
import { fetchForecast, type ForecastSnapshot, type ForecastStore } from "../src/api/forecast-client";

class MemoryStore implements ForecastStore {
  snapshot: ForecastSnapshot | undefined;

  read() {
    return this.snapshot;
  }

  write(snapshot: ForecastSnapshot) {
    this.snapshot = snapshot;
  }
}

const now = () => new Date("2026-08-11T02:00:00.000Z");

describe("fetchForecast", () => {
  it("validates and caches a successful response", async () => {
    const store = new MemoryStore();
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(validFixture), {
        status: 200,
        headers: { "content-type": "application/json", etag: 'W/"forecast-1"' },
      }),
    );

    const result = await fetchForecast({ store, fetchImpl, now });

    expect(result.isStale).toBe(false);
    expect(result.lastSuccessfulRequestAt).toBe("2026-08-11T02:00:00.000Z");
    expect(store.snapshot?.etag).toBe('W/"forecast-1"');
    expect(store.snapshot?.lastSuccessfulRequestAt).toBe("2026-08-11T02:00:00.000Z");
  });

  it("sends the cached ETag and reuses data after a 304", async () => {
    const store = new MemoryStore();
    const firstFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(validFixture), {
        status: 200,
        headers: { etag: 'W/"forecast-1"' },
      }),
    );
    await fetchForecast({ store, fetchImpl: firstFetch, now });

    const secondFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 304 }));
    const refreshedNow = () => new Date("2026-08-11T03:00:00.000Z");
    const result = await fetchForecast({ store, fetchImpl: secondFetch, now: refreshedNow });

    const [, request] = secondFetch.mock.calls[0];
    expect(new Headers(request?.headers).get("If-None-Match")).toBe('W/"forecast-1"');
    expect(result.isStale).toBe(false);
    expect(result.response.forecast.score).toBe(64);
    expect(result.response.fetchedAt).toBe(validFixture.fetchedAt);
    expect(result.lastSuccessfulRequestAt).toBe("2026-08-11T03:00:00.000Z");
    expect(store.snapshot?.lastSuccessfulRequestAt).toBe("2026-08-11T03:00:00.000Z");
  });

  it("rejects a 304 response when no cached data exists", async () => {
    const store = new MemoryStore();

    await expect(
      fetchForecast({
        store,
        fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 304 })),
        now,
      }),
    ).rejects.toThrow("Forecast API returned 304 without cached data");
  });

  it("returns stale cached data after a network failure", async () => {
    const store = new MemoryStore();
    const successfulFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(validFixture)));
    await fetchForecast({ store, fetchImpl: successfulFetch, now });

    const failedFetch = vi.fn<typeof fetch>().mockRejectedValue(new Error("offline"));
    const result = await fetchForecast({ store, fetchImpl: failedFetch, now });

    expect(result.isStale).toBe(true);
    expect(result.warning).toBe("offline");
  });

  it("preserves valid cached data when a new response is invalid", async () => {
    const store = new MemoryStore();
    await fetchForecast({
      store,
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(validFixture))),
      now,
    });

    const result = await fetchForecast({
      store,
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ broken: true }))),
      now,
    });

    expect(result.isStale).toBe(true);
    expect(result.response.forecast.score).toBe(64);
  });

  it("throws when no cached response is available", async () => {
    const store = new MemoryStore();

    await expect(
      fetchForecast({
        store,
        fetchImpl: vi.fn<typeof fetch>().mockRejectedValue(new Error("offline")),
        now,
      }),
    ).rejects.toThrow("offline");
  });
});
