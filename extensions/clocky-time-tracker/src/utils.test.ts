import { describe, expect, it } from "vitest";
import {
  allPausesWithinSession,
  closeSessionAt,
  detectTickGapMs,
  getDaySummary,
  getForgotClockInSuggestion,
  getForgotClockOutSuggestion,
  getWeekSummary,
  hasAnotherOpenSession,
  hasOverlappingPause,
  hasOverlappingSession,
  isOpenWithFutureStart,
  isPauseWithinSession,
  normalizeWorkDays,
} from "./utils";
import { Pause, Session } from "./types";

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

describe("getDaySummary slices", () => {
  const overnight: Session = { id: "a", start: "2026-09-07T22:00:00", end: "2026-09-08T06:00:00" };

  it("clips an overnight session to the start of the next day", () => {
    const [slice] = getDaySummary([overnight], new Date("2026-09-08T12:00:00")).slices;
    expect(slice.start.getTime()).toBe(new Date("2026-09-08T00:00:00").getTime());
    expect(slice.end.getTime()).toBe(new Date("2026-09-08T06:00:00").getTime());
  });

  it("clips an overnight session to the end of its first day", () => {
    const [slice] = getDaySummary([overnight], new Date("2026-09-07T12:00:00")).slices;
    expect(slice.start.getTime()).toBe(new Date("2026-09-07T22:00:00").getTime());
    expect(slice.end.getTime()).toBe(new Date("2026-09-07T23:59:59.999").getTime());
  });

  it("ends an open session's slice at now when viewing today", () => {
    const nowIso = new Date("2026-09-07T12:00:00").toISOString();
    const open: Session = { id: "b", start: "2026-09-07T08:00:00" };
    const [slice] = getDaySummary([open], new Date("2026-09-07T12:00:00"), nowIso).slices;
    expect(slice.end.toISOString()).toBe(nowIso);
  });
});

describe("getWeekSummary", () => {
  const monday = new Date("2026-09-07T00:00:00");
  const hour = 3600 * 1000;
  const saturdaySession: Session = { id: "sat", start: "2026-09-12T09:00:00", end: "2026-09-12T11:00:00" };
  const nowIso = new Date("2026-09-20T12:00:00").toISOString();

  it("lists only work days when no non-work day has sessions", () => {
    const { days } = getWeekSummary([], monday, 3, 8, [], nowIso);
    expect(days.map((d) => d.day.getDate())).toEqual([7, 8, 9]);
  });

  it("lists all 7 days when workDaysPerWeek is 7", () => {
    expect(getWeekSummary([], monday, 7, 8, [], nowIso).days).toHaveLength(7);
  });

  it("clamps workDaysPerWeek above 7 down to 7", () => {
    expect(getWeekSummary([], monday, 10, 8, [], nowIso).days).toHaveLength(7);
  });

  it("clamps workDaysPerWeek below 1 up to 1", () => {
    expect(getWeekSummary([], monday, 0, 8, [], nowIso).days).toHaveLength(1);
  });

  it("floors a fractional workDaysPerWeek", () => {
    expect(getWeekSummary([], monday, 5.9, 8, [], nowIso).days).toHaveLength(5);
  });

  it("counts weekend work in the weekly totals and shows the weekend day", () => {
    const week = getWeekSummary([saturdaySession], monday, 5, 8, [], nowIso);
    expect(week.totals.net).toBe(2 * hour);
    expect(week.targetMs).toBe(40 * hour);
    expect(week.delta).toBe(-38 * hour);
    const saturday = week.days.find((d) => d.day.getDate() === 12);
    expect(saturday?.isWorkDay).toBe(false);
    expect(saturday?.targetMs).toBe(0);
  });

  it("does not lower the weekly target for a vacation on a non-work day", () => {
    const week = getWeekSummary([saturdaySession], monday, 5, 8, ["2026-09-12"], nowIso);
    expect(week.targetMs).toBe(40 * hour);
    expect(week.days.find((d) => d.day.getDate() === 12)?.isVacation).toBe(false);
  });

  it("lowers the weekly target for a vacation on a work day", () => {
    const week = getWeekSummary([], monday, 5, 8, ["2026-09-08"], nowIso);
    expect(week.targetMs).toBe(32 * hour);
  });
});

describe("normalizeWorkDays", () => {
  it("passes whole numbers through unchanged", () => {
    expect(normalizeWorkDays(3)).toBe(3);
  });

  it("floors fractional values", () => {
    expect(normalizeWorkDays(5.9)).toBe(5);
  });

  it("clamps values above 7 down to 7", () => {
    expect(normalizeWorkDays(10)).toBe(7);
  });

  it("clamps values below 1 up to 1", () => {
    expect(normalizeWorkDays(0)).toBe(1);
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
  const nowIso = "2026-09-07T12:00:00.000Z";

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
    expect(isPauseWithinSession(sessionStart, null, new Date("2026-09-07T09:00:00.000Z"), null, nowIso)).toBe(true);
  });

  it("accepts a closed pause ending before now on an open session", () => {
    expect(
      isPauseWithinSession(
        sessionStart,
        null,
        new Date("2026-09-07T09:00:00.000Z"),
        new Date("2026-09-07T09:30:00.000Z"),
        nowIso,
      ),
    ).toBe(true);
  });

  it("rejects a closed pause ending after now on an open session", () => {
    expect(
      isPauseWithinSession(
        sessionStart,
        null,
        new Date("2026-09-07T09:00:00.000Z"),
        new Date("2026-09-07T13:00:00.000Z"),
        nowIso,
      ),
    ).toBe(false);
  });

  it("rejects an open pause starting after a closed session's end", () => {
    expect(isPauseWithinSession(sessionStart, sessionEnd, new Date("2026-09-07T17:00:00.000Z"), null)).toBe(false);
  });

  it("rejects an open pause that otherwise fits within a closed session", () => {
    expect(isPauseWithinSession(sessionStart, sessionEnd, new Date("2026-09-07T09:00:00.000Z"), null)).toBe(false);
  });
});

describe("allPausesWithinSession", () => {
  const sessionStart = new Date("2026-09-07T08:00:00.000Z");
  const sessionEnd = new Date("2026-09-07T16:00:00.000Z");

  it("returns true when there are no pauses", () => {
    expect(allPausesWithinSession(undefined, sessionStart, sessionEnd)).toBe(true);
    expect(allPausesWithinSession([], sessionStart, sessionEnd)).toBe(true);
  });

  it("returns true when every pause still fits within the new bounds", () => {
    const pauses: Pause[] = [
      { start: "2026-09-07T09:00:00.000Z", end: "2026-09-07T09:30:00.000Z" },
      { start: "2026-09-07T12:00:00.000Z", end: "2026-09-07T12:30:00.000Z" },
    ];
    expect(allPausesWithinSession(pauses, sessionStart, sessionEnd)).toBe(true);
  });

  it("returns false when a pause falls outside the shrunk end bound", () => {
    const pauses: Pause[] = [{ start: "2026-09-07T15:00:00.000Z", end: "2026-09-07T15:30:00.000Z" }];
    const shrunkEnd = new Date("2026-09-07T14:00:00.000Z");
    expect(allPausesWithinSession(pauses, sessionStart, shrunkEnd)).toBe(false);
  });

  it("returns false when a pause falls outside the shrunk start bound", () => {
    const pauses: Pause[] = [{ start: "2026-09-07T09:00:00.000Z", end: "2026-09-07T09:30:00.000Z" }];
    const laterStart = new Date("2026-09-07T10:00:00.000Z");
    expect(allPausesWithinSession(pauses, laterStart, sessionEnd)).toBe(false);
  });

  it("checks every pause, not just the first", () => {
    const pauses: Pause[] = [
      { start: "2026-09-07T09:00:00.000Z", end: "2026-09-07T09:30:00.000Z" },
      { start: "2026-09-07T15:00:00.000Z", end: "2026-09-07T15:30:00.000Z" },
    ];
    const shrunkEnd = new Date("2026-09-07T14:00:00.000Z");
    expect(allPausesWithinSession(pauses, sessionStart, shrunkEnd)).toBe(false);
  });

  it("returns false when the session gains an end while a pause is still open", () => {
    const pauses: Pause[] = [{ start: "2026-09-07T09:00:00.000Z" }];
    expect(allPausesWithinSession(pauses, sessionStart, sessionEnd)).toBe(false);
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

  it("treats a second open pause as overlapping an existing open pause", () => {
    const openPauses = [{ start: "2026-09-07T09:00:00.000Z" }];
    expect(
      hasOverlappingPause(
        openPauses,
        new Date("2026-09-07T09:15:00.000Z"),
        null,
        undefined,
        "2026-09-07T10:00:00.000Z",
      ),
    ).toBe(true);
  });
});

describe("isOpenWithFutureStart", () => {
  const nowIso = "2026-09-07T12:00:00.000Z";

  it("returns true for an open entry starting after now", () => {
    expect(isOpenWithFutureStart(new Date("2026-09-07T13:00:00.000Z"), null, nowIso)).toBe(true);
  });

  it("returns false for an open entry starting before now", () => {
    expect(isOpenWithFutureStart(new Date("2026-09-07T11:00:00.000Z"), null, nowIso)).toBe(false);
  });

  it("returns false for an open entry starting exactly now", () => {
    expect(isOpenWithFutureStart(new Date(nowIso), undefined, nowIso)).toBe(false);
  });

  it("returns false for a closed entry starting after now", () => {
    expect(
      isOpenWithFutureStart(new Date("2026-09-07T13:00:00.000Z"), new Date("2026-09-07T14:00:00.000Z"), nowIso),
    ).toBe(false);
  });
});

describe("hasOverlappingSession", () => {
  const sessions: Session[] = [
    { id: "a", start: "2026-09-07T09:00:00.000Z", end: "2026-09-07T10:00:00.000Z" },
    { id: "b", start: "2026-09-07T12:00:00.000Z", end: "2026-09-07T13:00:00.000Z" },
  ];

  it("returns false when the candidate does not overlap any session", () => {
    expect(
      hasOverlappingSession(sessions, new Date("2026-09-07T10:30:00.000Z"), new Date("2026-09-07T11:30:00.000Z")),
    ).toBe(false);
  });

  it("returns true when the candidate overlaps an existing closed session", () => {
    expect(
      hasOverlappingSession(sessions, new Date("2026-09-07T09:30:00.000Z"), new Date("2026-09-07T09:45:00.000Z")),
    ).toBe(true);
  });

  it("treats the currently open session's missing end as now", () => {
    const withOpen: Session[] = [...sessions, { id: "c", start: "2026-09-07T14:00:00.000Z" }];
    expect(
      hasOverlappingSession(
        withOpen,
        new Date("2026-09-07T14:30:00.000Z"),
        new Date("2026-09-07T15:00:00.000Z"),
        undefined,
        "2026-09-07T16:00:00.000Z",
      ),
    ).toBe(true);
  });

  it("excludes the session being edited from the check", () => {
    expect(
      hasOverlappingSession(sessions, new Date("2026-09-07T09:30:00.000Z"), new Date("2026-09-07T09:45:00.000Z"), "a"),
    ).toBe(false);
  });

  it("does not treat sessions that only touch at a shared boundary as overlapping", () => {
    expect(
      hasOverlappingSession(sessions, new Date("2026-09-07T10:00:00.000Z"), new Date("2026-09-07T12:00:00.000Z")),
    ).toBe(false);
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

describe("closeSessionAt", () => {
  const endIso = "2026-09-07T17:00:00.000Z";

  it("closes every open pause on the session", () => {
    const session: Session = {
      id: "a",
      start: "2026-09-07T09:00:00.000Z",
      pauses: [
        { start: "2026-09-07T10:00:00.000Z" },
        { start: "2026-09-07T11:00:00.000Z", end: "2026-09-07T11:15:00.000Z" },
        { start: "2026-09-07T12:00:00.000Z" },
      ],
    };
    closeSessionAt(session, endIso);
    expect(session.end).toBe(endIso);
    expect(session.pauses?.[0].end).toBe(endIso);
    expect(session.pauses?.[1].end).toBe("2026-09-07T11:15:00.000Z");
    expect(session.pauses?.[2].end).toBe(endIso);
  });

  it("closes a single open pause, unchanged from prior behavior", () => {
    const session: Session = {
      id: "a",
      start: "2026-09-07T09:00:00.000Z",
      pauses: [{ start: "2026-09-07T10:00:00.000Z" }],
    };
    closeSessionAt(session, endIso);
    expect(session.end).toBe(endIso);
    expect(session.pauses?.[0].end).toBe(endIso);
  });

  it("does nothing to pauses when there are none open", () => {
    const session: Session = {
      id: "a",
      start: "2026-09-07T09:00:00.000Z",
      pauses: [{ start: "2026-09-07T10:00:00.000Z", end: "2026-09-07T10:15:00.000Z" }],
    };
    closeSessionAt(session, endIso);
    expect(session.end).toBe(endIso);
    expect(session.pauses?.[0].end).toBe("2026-09-07T10:15:00.000Z");
  });

  it("clamps a closed pause that ends after the session end", () => {
    const session: Session = {
      id: "a",
      start: "2026-09-07T09:00:00.000Z",
      pauses: [{ start: "2026-09-07T16:30:00.000Z", end: "2026-09-07T17:30:00.000Z" }],
    };
    closeSessionAt(session, endIso);
    expect(session.pauses).toEqual([{ start: "2026-09-07T16:30:00.000Z", end: endIso }]);
  });

  it("drops pauses that start at or after the session end", () => {
    const session: Session = {
      id: "a",
      start: "2026-09-07T09:00:00.000Z",
      pauses: [
        { start: "2026-09-07T10:00:00.000Z", end: "2026-09-07T10:15:00.000Z" },
        { start: "2026-09-07T17:00:00.000Z" },
        { start: "2026-09-07T18:00:00.000Z", end: "2026-09-07T18:30:00.000Z" },
      ],
    };
    closeSessionAt(session, endIso);
    expect(session.pauses).toEqual([{ start: "2026-09-07T10:00:00.000Z", end: "2026-09-07T10:15:00.000Z" }]);
  });

  it("handles a session with no pauses", () => {
    const session: Session = { id: "a", start: "2026-09-07T09:00:00.000Z" };
    closeSessionAt(session, endIso);
    expect(session.end).toBe(endIso);
  });
});
