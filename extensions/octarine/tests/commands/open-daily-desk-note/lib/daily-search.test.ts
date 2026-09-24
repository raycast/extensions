import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDailySearch, prioritizeExactDateMatches } from "@commands/open-daily-desk-note/lib/daily-search";
import type { WorkspaceSection } from "@type/notes";
import type { IndexedNote } from "@type/notes";

const workspace = { name: "Work", path: "/tmp/work" };

function dailyNote(dateStem: string, title: string): IndexedNote {
  const notePath = `Daily/${dateStem}.md`;

  return {
    id: path.resolve(workspace.path, notePath),
    title,
    path: notePath,
    folder: { name: "Daily", path: "Daily", workspace },
    pinned: false,
    searchText: `${title} ${dateStem} ${notePath} Work`.toLowerCase(),
  };
}

function matches(note: IndexedNote, searchText: string): boolean {
  return createDailySearch(searchText).matches(note);
}

describe("createDailySearch", () => {
  it("matches full dates regardless of the expression format", () => {
    const note = dailyNote("2026-12-22", "December 22, 2026");

    expect(matches(note, "22 Dec, 2026")).toBe(true);
    expect(matches(note, "2026-12-22")).toBe(true);
    expect(matches(note, "2026-12-21")).toBe(false);
  });

  it("matches month-day expressions in any year and their fuzzy variants", () => {
    const mayFifth = dailyNote("2024-05-05", "May 5, 2024");
    const mayFifteenth = dailyNote("2026-05-15", "May 15, 2026");

    expect(matches(mayFifth, "may 5")).toBe(true);
    expect(matches(mayFifteenth, "may 5")).toBe(true);
  });

  it("combines exact date matches with fuzzy text matches", () => {
    const exact = dailyNote("2026-02-02", "February 2, 2026");
    const laterInMonth = dailyNote("2026-02-26", "February 26, 2026");
    const otherMonth = dailyNote("2026-03-26", "March 26, 2026");

    expect(matches(exact, "feb 2")).toBe(true);
    expect(matches(laterInMonth, "feb 2")).toBe(true);
    expect(matches(otherMonth, "feb 2")).toBe(false);
  });

  it("matches weeks against weekly and daily notes", () => {
    const weekly = dailyNote("2026-W13", "Week 13, 2026");
    const inside = dailyNote("2026-03-26", "March 26, 2026");
    const outside = dailyNote("2026-03-15", "March 15, 2026");

    expect(matches(weekly, "2026-W13")).toBe(true);
    expect(matches(inside, "2026-W13")).toBe(true);
    expect(matches(outside, "2026-W13")).toBe(false);
  });

  it("falls back to text search for non-date queries", () => {
    const note = dailyNote("2023-02-18", "February 18, 2023");

    expect(matches(note, "feb")).toBe(true);
    expect(matches(note, "2023-02")).toBe(true);
    expect(matches(note, "2024")).toBe(false);
  });
});

describe("prioritizeExactDateMatches", () => {
  it("moves exact date matches to the front and counts them", () => {
    const sections: WorkspaceSection[] = [
      {
        name: "Work",
        path: "/tmp/work",
        notes: [dailyNote("2026-05-20", "May 20, 2026"), dailyNote("2024-05-02", "May 2, 2024")],
      },
    ];

    const result = prioritizeExactDateMatches(sections, { kind: "month-day", month: 5, day: 2 });

    expect(result.hasExactMatch).toBe(true);
    expect(result.sections[0].notes.map((note) => note.path)).toEqual(["Daily/2024-05-02.md", "Daily/2026-05-20.md"]);
  });

  it("keeps the original order when there is no exact match", () => {
    const sections: WorkspaceSection[] = [
      { name: "Work", path: "/tmp/work", notes: [dailyNote("2026-05-20", "May 20, 2026")] },
    ];

    const result = prioritizeExactDateMatches(sections, { kind: "month-day", month: 5, day: 2 });

    expect(result.hasExactMatch).toBe(false);
    expect(result.sections).toEqual(sections);
  });

  it("counts exact matches across sections", () => {
    const sections: WorkspaceSection[] = [
      { name: "Work", path: "/tmp/work", notes: [dailyNote("2026-05-02", "May 2, 2026")] },
      {
        name: "Personal",
        path: "/tmp/personal",
        notes: [dailyNote("2023-05-02", "May 2, 2023"), dailyNote("2026-05-20", "May 20, 2026")],
      },
    ];

    const result = prioritizeExactDateMatches(sections, { kind: "month-day", month: 5, day: 2 });

    expect(result.hasExactMatch).toBe(true);
    expect(result.sections[1].notes.map((note) => note.path)).toEqual(["Daily/2023-05-02.md", "Daily/2026-05-20.md"]);
  });
});
