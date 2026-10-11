import { describe, expect, it } from "vitest";

import { mapWithConcurrency } from "./concurrency";

describe("mapWithConcurrency", () => {
  it("keeps the input order while bounding how many run at once", async () => {
    let running = 0;
    let peak = 0;
    const items = [10, 20, 30, 40, 50];

    const results = await mapWithConcurrency(items, 2, async (item) => {
      running += 1;
      peak = Math.max(peak, running);
      await Promise.resolve();
      running -= 1;
      return item * 2;
    });

    expect(results).toEqual([20, 40, 60, 80, 100]);
    expect(peak).toBeLessThanOrEqual(2);
  });

  it("handles empty input and limits larger than the input", async () => {
    expect(await mapWithConcurrency([], 4, () => Promise.resolve("x"))).toEqual([]);
    expect(await mapWithConcurrency([1], 10, (item) => Promise.resolve(item))).toEqual([1]);
  });

  it("rejects when a worker fails", async () => {
    await expect(
      mapWithConcurrency([1, 2], 1, (item) => (item === 2 ? Promise.reject(new Error("boom")) : Promise.resolve(item))),
    ).rejects.toThrow("boom");
  });
});
