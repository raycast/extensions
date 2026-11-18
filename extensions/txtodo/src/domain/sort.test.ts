import { describe, expect, it } from "vitest";
import { parseLine } from "./parser";
import { groupByPriority, PRIORITY_KEYS, sortGroup } from "./sort";

describe("groupByPriority", () => {
  it("buckets tasks by priority including 'none' bucket", () => {
    const tasks = [
      parseLine("(A) Top", 0),
      parseLine("(B) Mid", 1),
      parseLine("No prio", 2),
      parseLine("(A) Another top", 3),
    ];
    const groups = groupByPriority(tasks);
    expect(groups.get("A")?.length).toBe(2);
    expect(groups.get("B")?.length).toBe(1);
    expect(groups.get("none")?.length).toBe(1);
  });

  it("omits empty buckets from the returned Map", () => {
    const groups = groupByPriority([parseLine("Buy milk", 0)]);
    expect(groups.has("A")).toBe(false);
    expect(groups.has("none")).toBe(true);
  });
});

describe("sortGroup", () => {
  it("orders by due: ascending, with no-due tasks last (file order tiebreak)", () => {
    const tasks = [
      parseLine("Z task due:2026-05-30", 2),
      parseLine("No due task", 0),
      parseLine("A task due:2026-05-20", 1),
    ];
    const sorted = sortGroup(tasks);
    expect(sorted.map((t) => t.lineNumber)).toEqual([1, 2, 0]);
  });

  it("preserves file order when no due dates", () => {
    const tasks = [parseLine("A", 5), parseLine("B", 2), parseLine("C", 8)];
    const sorted = sortGroup(tasks);
    expect(sorted.map((t) => t.lineNumber)).toEqual([2, 5, 8]);
  });
});

describe("PRIORITY_KEYS", () => {
  it("is A through Z followed by 'none'", () => {
    expect(PRIORITY_KEYS[0]).toBe("A");
    expect(PRIORITY_KEYS[25]).toBe("Z");
    expect(PRIORITY_KEYS[26]).toBe("none");
    expect(PRIORITY_KEYS.length).toBe(27);
  });
});
