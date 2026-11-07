import { describe, expect, it } from "vitest";
import {
  ALL,
  ARCHIVED,
  DAILY_JOTS,
  filterNotesByTag,
  matchesTagFilter,
  NO_DAILY_JOTS,
  tagFilterValue,
  UNTAGGED,
} from "../src/lib/tags";
import { aNote } from "./builders";

describe("matchesTagFilter", () => {
  it("matches a tag and its child tags, but not similar names", () => {
    const filter = tagFilterValue("projects");
    expect(matchesTagFilter(["projects"], filter)).toBe(true);
    expect(matchesTagFilter(["projects/homelab"], filter)).toBe(true);
    expect(matchesTagFilter(["projects-old"], filter)).toBe(false);
  });

  it("matches untagged notes only for the untagged filter", () => {
    expect(matchesTagFilter([], UNTAGGED)).toBe(true);
    expect(matchesTagFilter(["a"], UNTAGGED)).toBe(false);
  });
});

describe("filterNotesByTag", () => {
  const jot = aNote({ name: "October 18th, 2026", tags: ["daily-jots"] });
  const archivedJot = aNote({ name: "October 1st, 2026", tags: ["daily-jots"], archived: true });
  const project = aNote({ name: "Homelab", tags: ["projects/homelab"] });
  const archived = aNote({ name: "Old", archived: true });
  const notes = [jot, archivedJot, project, archived];

  it("hides archived notes from normal filters", () => {
    expect(filterNotesByTag(notes, ALL)).toEqual([jot, project]);
  });

  it("shows only archived notes for the archived filter", () => {
    expect(filterNotesByTag(notes, ARCHIVED)).toEqual([archivedJot, archived]);
  });

  it("includes archived jots in the Daily Jots filter", () => {
    expect(filterNotesByTag(notes, DAILY_JOTS)).toEqual([jot, archivedJot]);
  });

  it("excludes jots and archived notes from All Notes Except Daily Jots", () => {
    expect(filterNotesByTag(notes, NO_DAILY_JOTS)).toEqual([project]);
  });
});
