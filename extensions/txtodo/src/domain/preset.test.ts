import { describe, expect, it } from "vitest";
import type { Task } from "./parser";
import { parseLine } from "./parser";
import { applyPreset, isValidPreset, VIEW_PRESETS } from "./preset";

describe("VIEW_PRESETS", () => {
  it("contains the five presets in canonical order", () => {
    expect(VIEW_PRESETS).toEqual(["all", "today", "this-week", "overdue", "completed"]);
  });
});

describe("isValidPreset", () => {
  it("accepts every literal in VIEW_PRESETS", () => {
    for (const p of VIEW_PRESETS) {
      expect(isValidPreset(p)).toBe(true);
    }
  });

  it("rejects unknown strings", () => {
    expect(isValidPreset("nope")).toBe(false);
    expect(isValidPreset("")).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(isValidPreset(undefined)).toBe(false);
    expect(isValidPreset(null)).toBe(false);
    expect(isValidPreset(42)).toBe(false);
    expect(isValidPreset({ preset: "today" })).toBe(false);
  });
});

const NOW = new Date(2026, 4, 14, 12, 0, 0); // 2026-05-14 noon, Thursday

// Fixtures cover every interesting combination of completed / due / tags.
const FIXTURES: Record<string, Task> = {
  overdue: parseLine("Pay rent due:2026-05-10", 0),
  today: parseLine("Stand-up due:2026-05-14", 1),
  saturday: parseLine("Mow lawn due:2026-05-16", 2),
  sunday: parseLine("Plan week due:2026-05-17", 3),
  nextThursday: parseLine("Demo due:2026-05-21", 4),
  noDueNoTags: parseLine("Read book", 5),
  noDueOneProject: parseLine("Refactor +work", 6),
  completedOverdue: parseLine("x 2026-05-12 Old chore due:2026-05-10", 7),
};

function ids(tasks: Task[]): string[] {
  return tasks.map((t) => {
    const entry = Object.entries(FIXTURES).find(([, f]) => f.lineNumber === t.lineNumber && f.raw === t.raw);
    return entry ? entry[0] : `unknown(${t.lineNumber})`;
  });
}

const ALL_FIXTURES = Object.values(FIXTURES);

describe("applyPreset", () => {
  it("preset 'all' returns every active (non-completed) task", () => {
    expect(ids(applyPreset(ALL_FIXTURES, "all", NOW))).toEqual([
      "overdue",
      "today",
      "saturday",
      "sunday",
      "nextThursday",
      "noDueNoTags",
      "noDueOneProject",
    ]);
  });

  it("preset 'today' returns active tasks with due ≤ today", () => {
    expect(ids(applyPreset(ALL_FIXTURES, "today", NOW))).toEqual(["overdue", "today"]);
  });

  it("preset 'this-week' returns active tasks with due ≤ upcoming Sunday inclusive", () => {
    expect(ids(applyPreset(ALL_FIXTURES, "this-week", NOW))).toEqual(["overdue", "today", "saturday", "sunday"]);
  });

  it("preset 'overdue' returns active tasks with due strictly before today", () => {
    expect(ids(applyPreset(ALL_FIXTURES, "overdue", NOW))).toEqual(["overdue"]);
  });

  it("preset 'completed' returns only completed tasks", () => {
    expect(ids(applyPreset(ALL_FIXTURES, "completed", NOW))).toEqual(["completedOverdue"]);
  });

  it("preset 'today' on a Sunday includes that day's due tasks", () => {
    const sundayNow = new Date(2026, 4, 17, 12, 0, 0); // 2026-05-17 Sunday
    const tasks = [parseLine("Plan week due:2026-05-17", 0)];
    expect(applyPreset(tasks, "today", sundayNow)).toHaveLength(1);
  });

  it("preset 'this-week' on a Sunday returns only that day", () => {
    const sundayNow = new Date(2026, 4, 17, 12, 0, 0); // Sunday
    const tasks = [parseLine("Plan week due:2026-05-17", 0), parseLine("Next Monday due:2026-05-18", 1)];
    expect(applyPreset(tasks, "this-week", sundayNow)).toHaveLength(1);
    expect(applyPreset(tasks, "this-week", sundayNow)[0].lineNumber).toBe(0);
  });
});
