import { describe, expect, it } from "vitest";
import { parseLine } from "./parser";
import { sectionsByDate } from "./sections";

describe("sectionsByDate", () => {
  it("partitions tasks into overdue / today / upNext / unscheduled by due date", () => {
    const now = new Date(2026, 4, 25); // May 25 2026
    const tasks = [
      parseLine("Pay invoice due:2026-05-20", 0), // overdue
      parseLine("(A) Draft report due:2026-05-25", 1), // today
      parseLine("(B) Plan offsite due:2026-05-28", 2), // upNext (future)
      parseLine("Buy milk", 3), // unscheduled (undated)
    ];

    const sections = sectionsByDate(tasks, now);

    expect(sections.overdue.map((t) => t.lineNumber)).toEqual([0]);
    expect(sections.today.map((t) => t.lineNumber)).toEqual([1]);
    expect(sections.upNext.map((t) => t.lineNumber)).toEqual([2]);
    expect(sections.unscheduled.map((t) => t.lineNumber)).toEqual([3]);
  });

  it("treats tasks with malformed due metadata as unscheduled", () => {
    const now = new Date(2026, 4, 25);
    const tasks = [parseLine("Bad due:not-a-date", 0)];

    const sections = sectionsByDate(tasks, now);

    expect(sections.overdue).toEqual([]);
    expect(sections.today).toEqual([]);
    expect(sections.upNext).toEqual([]);
    expect(sections.unscheduled.map((t) => t.lineNumber)).toEqual([0]);
  });

  it("treats a task due exactly at midnight today as Today, and 1 day earlier as Overdue", () => {
    const now = new Date(2026, 4, 25, 14, 30); // mid-afternoon
    const tasks = [parseLine("Right at today start due:2026-05-25", 0), parseLine("One day before due:2026-05-24", 1)];

    const sections = sectionsByDate(tasks, now);

    expect(sections.today.map((t) => t.lineNumber)).toEqual([0]);
    expect(sections.overdue.map((t) => t.lineNumber)).toEqual([1]);
  });

  it("returns four empty arrays for empty input", () => {
    const sections = sectionsByDate([], new Date());
    expect(sections.overdue).toEqual([]);
    expect(sections.today).toEqual([]);
    expect(sections.upNext).toEqual([]);
    expect(sections.unscheduled).toEqual([]);
  });

  it("sorts within each bucket by priority A→Z, then due ascending, then line number", () => {
    const now = new Date(2026, 4, 25);
    const tasks = [
      parseLine("(B) B-undated", 0),
      parseLine("(A) A-late due:2026-05-30", 1),
      parseLine("(A) A-early due:2026-05-27", 2),
      parseLine("No prio", 3),
      parseLine("(B) B-with-due due:2026-05-29", 4),
    ];

    const sections = sectionsByDate(tasks, now);

    // Up next holds future-dated only, sorted by priority A→Z then due ascending:
    // A-early (A, 5-27) → A-late (A, 5-30) → B-with-due (B, 5-29)
    expect(sections.upNext.map((t) => t.lineNumber)).toEqual([2, 1, 4]);
    // Unscheduled holds undated, same priority sort: B-undated (B) → No prio (none)
    expect(sections.unscheduled.map((t) => t.lineNumber)).toEqual([0, 3]);
  });

  it("separates undated tasks from future-dated ones", () => {
    const now = new Date(2026, 4, 25);
    const tasks = [parseLine("Future due:2026-06-01", 0), parseLine("Undated", 1)];

    const sections = sectionsByDate(tasks, now);

    expect(sections.upNext.map((t) => t.lineNumber)).toEqual([0]);
    expect(sections.unscheduled.map((t) => t.lineNumber)).toEqual([1]);
    expect(sections.overdue).toEqual([]);
    expect(sections.today).toEqual([]);
  });

  it("uses line number as a tiebreaker when priority and due date are equal", () => {
    const now = new Date(2026, 4, 25);
    const tasks = [parseLine("(A) Second due:2026-05-27", 5), parseLine("(A) First due:2026-05-27", 2)];

    const sections = sectionsByDate(tasks, now);

    expect(sections.upNext.map((t) => t.lineNumber)).toEqual([2, 5]);
  });
});
