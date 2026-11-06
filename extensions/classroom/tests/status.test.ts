import { describe, expect, it } from "vitest";
import { Assignment, submissionStatus, summarize } from "../src/lib/api";

const base: Assignment = {
  id: "w1",
  courseId: "c1",
  title: "Essay",
  courseName: "English",
  dueDate: { year: 2026, month: 11, day: 10 },
  dueTime: { hours: 12 },
};
const before = Date.UTC(2026, 10, 9);
const after = Date.UTC(2026, 10, 11);

describe("submissionStatus", () => {
  it("is unknown without submission data", () => {
    expect(submissionStatus(base, before)).toBe("unknown");
  });
  it("is todo before the due date and missing after it", () => {
    const item: Assignment = {
      ...base,
      submission: { kind: "mine", state: "CREATED", late: false },
    };
    expect(submissionStatus(item, before)).toBe("todo");
    expect(submissionStatus(item, after)).toBe("missing");
  });
  it("reports turned in, late and graded work", () => {
    expect(
      submissionStatus(
        {
          ...base,
          submission: { kind: "mine", state: "TURNED_IN", late: false },
        },
        after,
      ),
    ).toBe("done");
    expect(
      submissionStatus(
        {
          ...base,
          submission: { kind: "mine", state: "TURNED_IN", late: true },
        },
        after,
      ),
    ).toBe("late");
    expect(
      submissionStatus(
        {
          ...base,
          submission: {
            kind: "mine",
            state: "RETURNED",
            late: false,
            grade: 9,
          },
        },
        after,
      ),
    ).toBe("graded");
  });
  it("treats reclaimed work as not turned in", () => {
    const item: Assignment = {
      ...base,
      submission: { kind: "mine", state: "RECLAIMED_BY_STUDENT", late: false },
    };
    expect(submissionStatus(item, after)).toBe("missing");
  });
});

describe("summarize", () => {
  it("keys a student's own submissions by coursework", () => {
    const map = summarize(
      [
        {
          id: "s1",
          courseWorkId: "w1",
          state: "RETURNED",
          assignedGrade: 8,
          alternateLink: "https://evil.example/x",
        },
      ],
      true,
    );
    expect(map.get("w1")).toEqual({
      kind: "mine",
      state: "RETURNED",
      late: false,
      grade: 8,
      link: undefined,
    });
  });
  it("aggregates class submissions for teachers", () => {
    const map = summarize(
      [
        { id: "a", courseWorkId: "w1", state: "TURNED_IN", late: true },
        { id: "b", courseWorkId: "w1", state: "RETURNED" },
        { id: "c", courseWorkId: "w1", state: "CREATED" },
      ],
      false,
    );
    expect(map.get("w1")).toEqual({
      kind: "class",
      turnedIn: 1,
      returned: 1,
      total: 3,
      late: 1,
    });
  });
});
