import { describe, expect, it } from "vitest";
import type { TimeEntry } from "./api";
import { displayColor, duration, recentEntries } from "./model";

describe("recent timers", () => {
  it("keeps newest combinations without merging billable and nonbillable work", () => {
    const entry = { projectId: "project", note: "Design", billable: true, status: "completed" };
    const entries = [
      { ...entry, id: "new" },
      { ...entry, id: "old" },
      { ...entry, id: "free", billable: false },
      { ...entry, id: "active", status: "active" },
      { ...entry, id: "void", status: "voided" },
    ] as TimeEntry[];
    expect(recentEntries(entries).map((item) => item.id)).toEqual(["new", "free"]);
  });
  it("formats recorded time without changing server precision", () => {
    expect(duration(5459)).toBe("1h 30m");
    expect(duration(59)).toBe("0m");
  });
  it("merges visually identical descriptions and retains the newest duration", () => {
    const base = {
      projectId: "project",
      projectName: "Track Timer",
      billable: true,
      status: "completed",
    };
    const entries = [
      { ...base, id: "new", note: null, durationSeconds: 7 },
      { ...base, id: "empty", note: "" },
      { ...base, id: "whitespace", note: "  " },
      { ...base, id: "old", note: " Track Timer ", durationSeconds: 2580 },
      { ...base, id: "different", note: "Other work" },
      { ...base, id: "other-project", projectId: "other", note: null },
    ] as TimeEntry[];
    expect(recentEntries(entries).map((item) => item.id)).toEqual([
      "new",
      "different",
      "other-project",
    ]);
    expect(recentEntries(entries)[0].durationSeconds).toBe(7);
  });
  it("keeps entries regardless of their age", () => {
    const entries = [
      {
        id: "old",
        projectId: "project",
        projectName: "Project",
        note: null,
        billable: true,
        status: "completed",
        startedAt: "2020-01-01T00:00:00Z",
      },
    ] as TimeEntry[];
    expect(recentEntries(entries)).toEqual(entries);
  });
});

describe("display colors", () => {
  it("preserves resolved project and client colors", () => {
    expect(displayColor("#53816A")).toBe("#53816A");
    expect(displayColor("#ff5c35")).toBe("#ff5c35");
  });
  it.each([undefined, null, "", "red", "#abc", "#12345678", "#gggggg", 123456, {}])(
    "uses the brand color for missing or invalid values: %s",
    (color) => expect(displayColor(color)).toBe("#ff5c35"),
  );
});
