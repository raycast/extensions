import { describe, expect, it } from "vitest";
import { mapWithConcurrency } from "../../src/utils/async";

describe("mapWithConcurrency", () => {
  it("preserves input order regardless of completion order", async () => {
    const items = [30, 10, 20, 5];
    const results = await mapWithConcurrency(items, 2, async (ms) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      return ms * 2;
    });
    expect(results).toEqual([60, 20, 40, 10]);
  });

  it("never exceeds the concurrency limit", async () => {
    let active = 0;
    let peak = 0;
    await mapWithConcurrency(
      Array.from({ length: 20 }, (_, i) => i),
      3,
      async () => {
        active++;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 1));
        active--;
        return null;
      },
    );
    expect(peak).toBeLessThanOrEqual(3);
  });

  it("handles an empty input", async () => {
    expect(await mapWithConcurrency([], 4, async () => 1)).toEqual([]);
  });

  it("clamps concurrency to at least 1", async () => {
    const results = await mapWithConcurrency([1, 2, 3], 0, async (n) => n + 1);
    expect(results).toEqual([2, 3, 4]);
  });
});
