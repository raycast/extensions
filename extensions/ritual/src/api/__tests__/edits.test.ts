import { describe, expect, it } from "vitest";
import {
  diff,
  joinComposedText,
  scheduleOf,
  splitComposedText,
} from "../edits";
import type { RitualTask } from "../types";

function task(overrides: Partial<RitualTask> = {}): RitualTask {
  return {
    id: "1",
    title: "Water the plants",
    evening: false,
    completed: false,
    overdue: false,
    ...overrides,
  };
}

describe("diff", () => {
  it("sends only the fields that changed", () => {
    const t = task({ title: "old", notes: "n", deadline: "2026-08-01" });
    const edits = diff(t, {
      title: "new",
      notes: "n",
      deadline: "2026-08-01",
      project: null,
      tags: [],
    });
    expect(edits).toEqual({ title: "new" });
  });

  it("sends only notes when only notes changed", () => {
    const t = task({ title: "old", notes: "n", deadline: "2026-08-01" });
    const edits = diff(t, {
      title: "old",
      notes: "new",
      deadline: "2026-08-01",
      project: null,
      tags: [],
    });
    expect(edits).toEqual({ notes: "new" });
  });

  it("sends nothing when nothing changed", () => {
    const t = task({ notes: "n", deadline: "2026-08-01", project: "Home" });
    const edits = diff(t, {
      title: t.title,
      notes: "n",
      deadline: "2026-08-01",
      project: "Home",
      tags: [],
    });
    expect(edits).toEqual({});
  });

  it("sends null to clear a deadline that was set", () => {
    const t = task({ deadline: "2026-08-01" });
    const edits = diff(t, {
      title: t.title,
      notes: "",
      deadline: null,
      project: null,
      tags: [],
    });
    expect(edits.deadline).toBeNull();
  });

  it("sends null to clear a project that was set", () => {
    const t = task({ project: "Kitchen Reno" });
    const edits = diff(t, {
      title: t.title,
      notes: "",
      deadline: null,
      project: null,
      tags: [],
    });
    expect(edits.project).toBeNull();
  });

  it("computes tag additions and removals as separate sets", () => {
    const t = task({ tags: ["work", "urgent"] });
    const edits = diff(t, {
      title: t.title,
      notes: "",
      deadline: null,
      project: null,
      tags: ["urgent", "home"],
    });
    expect(edits.addTags).toEqual(["home"]);
    expect(edits.removeTags).toEqual(["work"]);
  });

  it("omits addTags/removeTags entirely when tags are unchanged", () => {
    const t = task({ tags: ["work"] });
    const edits = diff(t, {
      title: t.title,
      notes: "",
      deadline: null,
      project: null,
      tags: ["work"],
    });
    expect(edits.addTags).toBeUndefined();
    expect(edits.removeTags).toBeUndefined();
  });
});

describe("splitComposedText / joinComposedText", () => {
  it("round-trips a title and single-line notes", () => {
    const joined = joinComposedText("Water the plants", "Twice a week");
    expect(splitComposedText(joined)).toEqual({
      title: "Water the plants",
      notes: "Twice a week",
    });
  });

  it("round-trips notes with blank lines and multiple paragraphs, splitting only on the first newline", () => {
    const notes = "First paragraph.\n\nSecond paragraph,\nwith a second line.";
    const joined = joinComposedText("Water the plants", notes);
    expect(joined).toBe(`Water the plants\n${notes}`);
    expect(splitComposedText(joined)).toEqual({
      title: "Water the plants",
      notes,
    });
  });

  it("trims the title but leaves notes content, including leading indentation, untouched", () => {
    const result = splitComposedText(
      "  Water the plants  \n  - buy soil\n  - buy pot",
    );
    expect(result).toEqual({
      title: "Water the plants",
      notes: "  - buy soil\n  - buy pot",
    });
  });

  it("yields empty notes when there is no newline", () => {
    expect(splitComposedText("Water the plants")).toEqual({
      title: "Water the plants",
      notes: "",
    });
  });

  it("join with empty or undefined notes yields just the title, no trailing newline", () => {
    expect(joinComposedText("Water the plants", "")).toBe("Water the plants");
    expect(joinComposedText("Water the plants", undefined)).toBe(
      "Water the plants",
    );
  });

  it("yields an empty title when the text begins with a newline", () => {
    expect(splitComposedText("\nJust notes, no title")).toEqual({
      title: "",
      notes: "Just notes, no title",
    });
  });

  it("normalises Windows newlines before splitting, including inside notes", () => {
    const result = splitComposedText(
      "Water the plants\r\nLine one\r\nLine two",
    );
    expect(result).toEqual({
      title: "Water the plants",
      notes: "Line one\nLine two",
    });
  });
});

describe("the unified Task field, through splitComposedText, into diff", () => {
  // TaskForm no longer holds `title` and `notes` as separate state — both
  // live in one composed string that gets split right before it reaches
  // `diff`. These reproduce that exact path to prove the merge didn't widen
  // what gets sent: editing one half of the field must still diff as an
  // edit to only that half.
  it("editing only the title line sends only title", () => {
    const t = task({ title: "old", notes: "Twice a week" });
    const { title, notes } = splitComposedText("new\nTwice a week");
    expect(
      diff(t, { title, notes, deadline: null, project: null, tags: [] }),
    ).toEqual({
      title: "new",
    });
  });

  it("editing only a notes line sends only notes", () => {
    const t = task({ title: "Water the plants", notes: "Twice a week" });
    const { title, notes } = splitComposedText("Water the plants\nEvery day");
    expect(
      diff(t, { title, notes, deadline: null, project: null, tags: [] }),
    ).toEqual({
      notes: "Every day",
    });
  });

  it("an untouched composed field (seeded via joinComposedText) diffs to nothing", () => {
    const t = task({ title: "Water the plants", notes: "Twice a week" });
    const seeded = joinComposedText(t.title, t.notes);
    const { title, notes } = splitComposedText(seeded);
    expect(
      diff(t, { title, notes, deadline: null, project: null, tags: [] }),
    ).toEqual({});
  });
});

describe("scheduleOf", () => {
  const now = new Date(2026, 7, 9); // Aug 9 2026, matches "now" in these fixtures

  it("returns 'evening' when the task is scheduled for this evening", () => {
    expect(
      scheduleOf(task({ evening: true, scheduled: "2026-08-09" }), now),
    ).toBe("evening");
  });

  it("returns 'today' when scheduled for the current local day", () => {
    expect(scheduleOf(task({ scheduled: "2026-08-09" }), now)).toBe("today");
  });

  it("returns 'inbox' when there is no scheduled date", () => {
    expect(scheduleOf(task({ scheduled: undefined }), now)).toBe("inbox");
  });

  it("returns 'keep' — not 'today' — for a task scheduled on a future day", () => {
    // This is the regression this function exists to fix: a task scheduled
    // for next Tuesday must not report as "today".
    expect(scheduleOf(task({ scheduled: "2026-08-14" }), now)).toBe("keep");
  });
});
