import { describe, expect, it, vi } from "vitest";
import { toCrossJSON } from "seroval";
import fixture from "./fixtures/forecast-valid.json";
import { fetchForecast, FORECAST_URL, type ForecastSnapshot, type ForecastStore } from "../src/api/forecast-client";

class MemoryStore implements ForecastStore {
  snapshot?: ForecastSnapshot;
  writes: ForecastSnapshot[] = [];
  read() {
    return this.snapshot;
  }
  write(snapshot: ForecastSnapshot) {
    this.writes.push(snapshot);
    this.snapshot = snapshot;
  }
}
const now = () => new Date("2026-09-09T07:05:00Z");
const jsonResponse = (value = fixture) =>
  new Response(JSON.stringify(toCrossJSON({ result: value, error: undefined, context: {} })));

describe("fetchForecast", () => {
  it("fetches and validates the same structured endpoint as the website", async () => {
    const store = new MemoryStore();
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse());
    const result = await fetchForecast({ store, fetchImpl, now });
    expect(fetchImpl.mock.calls[0][0]).toBe(FORECAST_URL);
    expect(new Headers(fetchImpl.mock.calls[0][1]?.headers).get("x-tsr-serverFn")).toBe("true");
    expect(result.response.forecast?.score48h).toBe(43);
    expect(store.writes).toHaveLength(1);
    expect(result.lastSuccessfulRequestAt).toBe(now().toISOString());
  });

  it("keeps the snapshot and last successful check time through repeated failed refreshes", async () => {
    const store = new MemoryStore();
    const saved = await fetchForecast({
      store,
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(jsonResponse()),
      now,
    });
    for (const hours of [1, 2, 3]) {
      const result = await fetchForecast({
        store,
        fetchImpl: vi.fn<typeof fetch>().mockRejectedValue(new Error("offline")),
        now: () => new Date(now().getTime() + hours * 3_600_000),
      });
      expect(result).toBe(saved);
      expect(result.lastSuccessfulRequestAt).toBe(now().toISOString());
    }
    expect(store.writes).toHaveLength(1);
  });

  it.each([
    () => new Response("unavailable", { status: 503 }),
    () => new Response("<html>broken</html>"),
    () => new Response(JSON.stringify(toCrossJSON({ result: { broken: true } }))),
  ])("does not replace valid data after an HTTP, decode, or schema failure", async (failure) => {
    const store = new MemoryStore();
    await fetchForecast({ store, fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(jsonResponse()), now });
    const result = await fetchForecast({ store, fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(failure()), now });
    expect(result).toBe(store.snapshot);
    expect(store.writes).toHaveLength(1);
  });

  it("reports an uncached failure", async () => {
    await expect(
      fetchForecast({
        store: new MemoryStore(),
        fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 500 })),
        now,
      }),
    ).rejects.toThrow("HTTP 500");
  });

  it("aborts a hung request and retains the cache", async () => {
    const store = new MemoryStore();
    await fetchForecast({ store, fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(jsonResponse()), now });
    const fetchImpl: typeof fetch = (_url, options) =>
      new Promise((_resolve, reject) => options?.signal?.addEventListener("abort", () => reject(new Error("aborted"))));
    const result = await fetchForecast({ store, fetchImpl, now, timeoutMilliseconds: 5 });
    expect(result).toBe(store.snapshot);
    expect(store.writes).toHaveLength(1);
  });

  it("does not roll back a newer snapshot when an older request completes later", async () => {
    const store = new MemoryStore();
    let resolve!: (response: Response) => void;
    const delayed = fetchForecast({
      store,
      fetchImpl: () =>
        new Promise((done) => {
          resolve = done;
        }),
      now,
    });
    const newer = { ...fixture, updatedAt: "2026-09-09T08:00:00Z", forecast: { ...fixture.forecast, score24h: 60 } };
    await fetchForecast({ store, fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(newer)), now });
    resolve(jsonResponse());
    const result = await delayed;
    expect(result.response.forecast?.score24h).toBe(60);
    expect(store.writes).toHaveLength(1);
  });
});
