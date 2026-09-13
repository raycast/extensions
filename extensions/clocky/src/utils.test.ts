import { describe, expect, it } from "vitest";
import {
  detectTickGapMs,
  getDaySummary,
  getForgotClockInSuggestion,
  getForgotClockOutSuggestion,
  getVisibleWeekDays,
  hasAnotherOpenSession,
  hasOverlappingPause,
  isPauseWithinSession,
} from "./utils";
import { Session } from "./types";

describe("getDaySummary", () => {
  it("extends an open session to the full day when nowIso is later than the day itself", () => {
    const day = new Date("2026-09-07T12:00:00");
    const sessionStart = new Date(day);
    sessionStart.setHours(8, 0, 0, 0);
    const sessions: Session[] = [{ id: "a", start: sessionStart.toISOString() }];
    const nowIso = new Date("2026-09-10T12:00:00").toISOString();
    const { totals } = getDaySummary(sessions, day, nowIso);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    expect(totals.work).toBe(dayEnd.getTime() - sessionStart.getTime());
  });
});

describe("getVisibleWeekDays", () => {
  const monday = new Date("2026-09-07T00:00:00");

  it("returns the first N days starting from weekStart", () => {
    const days = getVisibleWeekDays(monday, 3);
    expect(days.map((d) => d.getDate())).toEqual([7, 8, 9]);
  });

  it("returns all 7 days when workDaysPerWeek is 7", () => {
    const days = getVisibleWeekDays(monday, 7);
    expect(days).toHaveLength(7);
  });

  it("clamps workDaysPerWeek above 7 down to 7", () => {
    const days = getVisibleWeekDays(monday, 10);
    expect(days).toHaveLength(7);
  });

  it("clamps workDaysPerWeek below 1 up to 1", () => {
    const days = getVisibleWeekDays(monday, 0);
    expect(days).toHaveLength(1);
  });

  it("floors a fractional workDaysPerWeek", () => {
    const days = getVisibleWeekDays(monday, 5.9);
    expect(days).toHaveLength(5);
  });
});

describe("hasAnotherOpenSession", () => {
  const open = (id: string): Session => ({ id, start: "2026-09-07T08:00:00.000Z" });
  const closed = (id: string): Session => ({
    id,
    start: "2026-09-07T08:00:00.000Z",
    end: "2026-09-07T09:00:00.000Z",
  });

  it("returns false when no session is open", () => {
    expect(hasAnotherOpenSession([closed("a"), closed("b")])).toBe(false);
  });

  it("returns true when another session is open", () => {
    expect(hasAnotherOpenSession([open("a"), closed("b")], "b")).toBe(true);
  });

  it("excludes the session being edited from the check", () => {
    expect(hasAnotherOpenSession([open("a")], "a")).toBe(false);
  });
});

describe("isPauseWithinSession", () => {
  const sessionStart = new Date("2026-09-07T08:00:00.000Z");
  const sessionEnd = new Date("2026-09-07T16:00:00.000Z");

  it("accepts a pause fully inside a closed session", () => {
    expect(
      isPauseWithinSession(
        sessionStart,
        sessionEnd,
        new Date("2026-09-07T09:00:00.000Z"),
        new Date("2026-09-07T09:30:00.000Z"),
      ),
    ).toBe(true);
  });

  it("rejects a pause starting before the session start", () => {
    expect(isPauseWithinSession(sessionStart, sessionEnd, new Date("2026-09-07T07:00:00.000Z"), null)).toBe(false);
  });

  it("rejects a pause ending after the session end", () => {
    expect(
      isPauseWithinSession(
        sessionStart,
        sessionEnd,
        new Date("2026-09-07T15:00:00.000Z"),
        new Date("2026-09-07T17:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("accepts an open-ended pause when the session is still open", () => {
    expect(isPauseWithinSession(sessionStart, null, new Date("2026-09-07T09:00:00.000Z"), null)).toBe(true);
  });

  it("rejects an open pause starting after a closed session's end", () => {
    expect(isPauseWithinSession(sessionStart, sessionEnd, new Date("2026-09-07T17:00:00.000Z"), null)).toBe(false);
  });
});

describe("hasOverlappingPause", () => {
  const pauses = [
    { start: "2026-09-07T09:00:00.000Z", end: "2026-09-07T09:30:00.000Z" },
    { start: "2026-09-07T12:00:00.000Z", end: "2026-09-07T12:30:00.000Z" },
  ];

  it("returns false when the candidate does not overlap any pause", () => {
    expect(
      hasOverlappingPause(pauses, new Date("2026-09-07T10:00:00.000Z"), new Date("2026-09-07T10:30:00.000Z")),
    ).toBe(false);
  });

  it("returns true when the candidate overlaps an existing pause", () => {
    expect(
      hasOverlappingPause(pauses, new Date("2026-09-07T09:15:00.000Z"), new Date("2026-09-07T09:45:00.000Z")),
    ).toBe(true);
  });

  it("excludes the pause being edited from the check", () => {
    expect(
      hasOverlappingPause(pauses, new Date("2026-09-07T09:00:00.000Z"), new Date("2026-09-07T09:30:00.000Z"), 0),
    ).toBe(false);
  });

  it("treats an open pause as overlapping anything after it starts", () => {
    const openPauses = [{ start: "2026-09-07T09:00:00.000Z" }];
    expect(
      hasOverlappingPause(
        openPauses,
        new Date("2026-09-07T09:15:00.000Z"),
        new Date("2026-09-07T09:45:00.000Z"),
        undefined,
        "2026-09-07T10:00:00.000Z",
      ),
    ).toBe(true);
  });
});

describe("detectTickGapMs", () => {
  it("returns the millisecond difference between two ISO timestamps", () => {
    expect(detectTickGapMs("2026-09-07T09:00:00.000Z", "2026-09-07T09:00:20.000Z")).toBe(20_000);
  });

  it("returns 0 for identical timestamps", () => {
    expect(detectTickGapMs("2026-09-07T09:00:00.000Z", "2026-09-07T09:00:00.000Z")).toBe(0);
  });
});

describe("getForgotClockOutSuggestion", () => {
  const thresholdMs = 15 * 60 * 1000; // 15 minutes
  const lastTickIso = "2026-09-07T12:00:00.000Z";
  const nowIso = "2026-09-07T12:20:00.000Z"; // 20 minute gap

  const openSession = (start: string): Session => ({ id: "a", start });

  it("returns null when there is no active session", () => {
    expect(getForgotClockOutSuggestion(undefined, lastTickIso, nowIso, thresholdMs)).toBeNull();
  });

  it("flags when the session started before the gap and the gap meets the threshold", () => {
    const result = getForgotClockOutSuggestion(
      openSession("2026-09-07T08:00:00.000Z"),
      lastTickIso,
      nowIso,
      thresholdMs,
    );
    expect(result).toEqual({ shouldFlag: true, suggestedEndIso: lastTickIso });
  });

  it("flags when the gap exactly equals the threshold", () => {
    const exactNowIso = "2026-09-07T12:15:00.000Z"; // exactly 15 minutes after lastTickIso
    const result = getForgotClockOutSuggestion(
      openSession("2026-09-07T08:00:00.000Z"),
      lastTickIso,
      exactNowIso,
      thresholdMs,
    );
    expect(result?.shouldFlag).toBe(true);
  });

  it("does not flag when the gap is below the threshold", () => {
    const shortNowIso = "2026-09-07T12:05:00.000Z"; // 5 minute gap
    const result = getForgotClockOutSuggestion(
      openSession("2026-09-07T08:00:00.000Z"),
      lastTickIso,
      shortNowIso,
      thresholdMs,
    );
    expect(result?.shouldFlag).toBe(false);
  });

  it("does not flag when the session started after the last tick (opened during/after the gap)", () => {
    const result = getForgotClockOutSuggestion(
      openSession("2026-09-07T12:10:00.000Z"), // started after lastTickIso, inside the gap
      lastTickIso,
      nowIso,
      thresholdMs,
    );
    expect(result?.shouldFlag).toBe(false);
  });
});

describe("getForgotClockInSuggestion", () => {
  const thresholdMs = 30 * 60 * 1000; // 30 minutes
  const awakeSinceIso = "2026-09-07T09:00:00.000Z";

  const openSession = (start: string): Session => ({ id: "a", start });

  it("returns null when a session is already active", () => {
    const result = getForgotClockInSuggestion(
      openSession("2026-09-07T09:00:00.000Z"),
      awakeSinceIso,
      "2026-09-07T09:40:00.000Z",
      thresholdMs,
    );
    expect(result).toBeNull();
  });

  it("flags when no session is active and the elapsed time meets the threshold", () => {
    const result = getForgotClockInSuggestion(undefined, awakeSinceIso, "2026-09-07T09:31:00.000Z", thresholdMs);
    expect(result).toEqual({ shouldFlag: true });
  });

  it("flags when the elapsed time exactly equals the threshold", () => {
    const result = getForgotClockInSuggestion(undefined, awakeSinceIso, "2026-09-07T09:30:00.000Z", thresholdMs);
    expect(result?.shouldFlag).toBe(true);
  });

  it("does not flag when the elapsed time is below the threshold", () => {
    const result = getForgotClockInSuggestion(undefined, awakeSinceIso, "2026-09-07T09:10:00.000Z", thresholdMs);
    expect(result?.shouldFlag).toBe(false);
  });
});
