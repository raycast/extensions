import { afterEach, describe, it, expect, vi } from "vitest";
import { getTodayStr, getProjectTitle, getTagTitles } from "./utils";
import type { Project, Tag } from "./types";

afterEach(() => {
  vi.useRealTimers();
});

describe("getTodayStr", () => {
  it("returns the local calendar date in YYYY-MM-DD format", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 3, 0, 30));

    const result = getTodayStr();

    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result).toBe("2026-08-03");
  });
});

describe("getProjectTitle", () => {
  const projects: Project[] = [
    { id: "p1", title: "Work" },
    { id: "p2", title: "Personal" },
  ];

  it('returns "Inbox" when projectId is undefined', () => {
    expect(getProjectTitle(undefined, projects)).toBe("Inbox");
  });

  it('returns "Inbox" when projectId is empty string', () => {
    expect(getProjectTitle("", projects)).toBe("Inbox");
  });

  it("returns the project title when project exists", () => {
    expect(getProjectTitle("p1", projects)).toBe("Work");
    expect(getProjectTitle("p2", projects)).toBe("Personal");
  });

  it("returns the projectId as fallback when project not found", () => {
    expect(getProjectTitle("nonexistent", projects)).toBe("nonexistent");
  });

  it("handles empty projects array", () => {
    expect(getProjectTitle("p1", [])).toBe("p1");
  });
});

describe("getTagTitles", () => {
  const tags: Tag[] = [
    { id: "t1", title: "urgent", color: "red" },
    { id: "t2", title: "optional" },
    { id: "t3", title: "later" },
  ];

  it("returns empty string when tagIds is undefined", () => {
    expect(getTagTitles(undefined, tags)).toBe("");
  });

  it("returns empty string when tagIds is empty array", () => {
    expect(getTagTitles([], tags)).toBe("");
  });

  it("returns formatted tag titles with # prefix", () => {
    expect(getTagTitles(["t1", "t2"], tags)).toBe("#urgent #optional");
  });

  it("skips unknown tag IDs without error", () => {
    expect(getTagTitles(["t1", "unknown"], tags)).toBe("#urgent");
  });

  it("handles all unknown tag IDs", () => {
    expect(getTagTitles(["unknown1", "unknown2"], tags)).toBe("");
  });

  it("returns single tag without extra spaces", () => {
    expect(getTagTitles(["t1"], tags)).toBe("#urgent");
  });
});
