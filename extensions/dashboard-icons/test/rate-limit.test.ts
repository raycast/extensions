import { describe, expect, it } from "vitest";
import { RequestBudget } from "../src/lib/rate-limit";

describe("RequestBudget", () => {
  it("allows up to the limit within the window and frees slots as they expire", () => {
    let now = 0;
    const budget = new RequestBudget(3, 60_000, () => now);
    expect([budget.take(), budget.take(), budget.take(), budget.take()]).toEqual([true, true, true, false]);
    now = 59_999;
    expect(budget.take()).toBe(false);
    now = 60_000;
    expect(budget.take()).toBe(true);
    expect(budget.take()).toBe(true);
    expect(budget.take()).toBe(true);
    expect(budget.take()).toBe(false);
  });
});
