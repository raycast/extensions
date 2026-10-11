import { describe, expect, it } from "vitest";

import { isAbortError, mapWithConcurrency } from "./async";

describe("async helpers", () => {
  it("preserves order while limiting active work", async () => {
    let active = 0;
    let maximumActive = 0;
    const results = await mapWithConcurrency([1, 2, 3, 4], 2, async (value) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await Promise.resolve();
      active -= 1;
      return value * 2;
    });
    expect(results).toEqual([2, 4, 6, 8]);
    expect(maximumActive).toBe(2);
  });

  it("rejects invalid concurrency and aborted work", async () => {
    await expect(mapWithConcurrency([1], 0, async (value) => value)).rejects.toThrow("positive integer");
    const controller = new AbortController();
    controller.abort();
    await expect(mapWithConcurrency([1], 1, async (value) => value, controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(isAbortError(controller.signal.reason)).toBe(true);
    expect(isAbortError(new Error("ordinary"))).toBe(false);
  });
});
