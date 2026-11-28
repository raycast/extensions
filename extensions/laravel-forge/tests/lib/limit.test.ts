import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { politeFetch } from "../../src/lib/limit";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// Five backing off at once would stall the queue if the slot were held
it("frees its concurrency slot while it waits out a 429", async () => {
  const reached: string[] = [];
  const seen = new Map<string, number>();

  vi.stubGlobal("fetch", async (url: string) => {
    reached.push(url);
    const n = (seen.get(url) ?? 0) + 1;
    seen.set(url, n);
    const limited = url.startsWith("/rate-limited") && n === 1;
    return {
      ok: !limited,
      status: limited ? 429 : 200,
      headers: { get: (header: string) => (header === "retry-after" ? "5" : null) },
    } as unknown as Response;
  });

  // MAX_IN_FLIGHT is 5, so these fill the pool
  const backing = Array.from({ length: 5 }, (_, i) => politeFetch(`/rate-limited-${i}`));
  const queued = politeFetch("/queued");

  await vi.advanceTimersByTimeAsync(0);
  expect(reached).toContain("/queued");

  await vi.advanceTimersByTimeAsync(5_000);
  await Promise.all([...backing, queued]);
  expect(reached.filter((url) => url === "/rate-limited-0")).toHaveLength(2);
});
