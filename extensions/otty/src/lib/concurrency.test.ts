import { describe, expect, it } from "vitest";
import { mapConcurrent } from "./concurrency";

describe("mapConcurrent", () => {
  it("keeps input order and never runs more than the limit at once", async () => {
    let running = 0;
    let peak = 0;
    const result = await mapConcurrent([5, 1, 4, 2, 3], 2, async (n) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, n * 2));
      running--;
      return n * 10;
    });
    expect(result).toEqual([50, 10, 40, 20, 30]);
    expect(peak).toBe(2);
  });

  it("handles an empty list", async () => {
    expect(await mapConcurrent([], 4, async (n: number) => n)).toEqual([]);
  });
});
