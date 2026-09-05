import { describe, expect, it } from "vitest";
import {
  DEADLINE_NEAR_DAYS,
  deadlineCount,
  deadlineLabel,
  deadlineUrgency,
  formatDay,
  parseDay,
} from "../dates";

describe("formatDay / parseDay", () => {
  it("round-trips a date without shifting the day", () => {
    // Deliberately a time close to UTC midnight, where `toISOString()` would
    // land on a different calendar day for anyone west of UTC — the exact
    // bug these helpers exist to prevent.
    const local = new Date(2026, 7, 14, 0, 30); // Aug 14 2026, 00:30 local
    expect(formatDay(local)).toBe("2026-08-14");
    expect(formatDay(parseDay(formatDay(local)))).toBe("2026-08-14");
  });

  it("parses YYYY-MM-DD at local midnight, not UTC midnight", () => {
    const parsed = parseDay("2026-08-14");
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(7); // 0-indexed
    expect(parsed.getDate()).toBe(14);
    expect(parsed.getHours()).toBe(0);
  });

  it("pads single-digit months and days", () => {
    expect(formatDay(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("would fail if formatDay used toISOString directly", () => {
    // A regression guard, but which local time crosses the UTC day boundary
    // depends on BOTH the sign of the host's offset and which end of the
    // day you probe — a single hard-coded probe time only crosses it in one
    // hemisphere, so it must be derived from the offset instead:
    //
    //   getTimezoneOffset() returns UTC-minus-local, in minutes — POSITIVE
    //   west of UTC (e.g. New York = +240), NEGATIVE east of UTC (e.g.
    //   Sydney = -600).
    //     - West of UTC (offset > 0): the LATE end of the day rolls forward
    //       into the next UTC day — probe 23:30.
    //     - East of UTC (offset < 0): the EARLY end of the day rolls back
    //       into the previous UTC day — probe 00:30.
    //     - Exactly UTC (offset === 0): no local time can cross the
    //       boundary, so the divergence this test exists to catch is
    //       unobservable on this host — assert only the round-trip half
    //       rather than silently no-op-passing the regression check.
    //
    // The offset is read from the date under test (Aug 14 2026), not from
    // `new Date()`: DST shifts the offset across the year, so a value read
    // "now" could disagree with the value that actually applies in August.
    const anchor = new Date(2026, 7, 14, 12, 0); // midday: never itself near the boundary
    const offset = anchor.getTimezoneOffset();
    const local =
      offset > 0
        ? new Date(2026, 7, 14, 23, 30)
        : offset < 0
          ? new Date(2026, 7, 14, 0, 30)
          : anchor;

    expect(formatDay(local)).toBe("2026-08-14");

    if (local.getTimezoneOffset() !== 0) {
      const wrongWay = local.toISOString().slice(0, 10);
      expect(formatDay(local)).not.toBe(wrongWay);
    }
  });
});

describe("deadlineLabel", () => {
  // A fixed "today" so these never depend on when the suite runs.
  const today = new Date(2026, 7, 14, 9, 0); // Aug 14 2026, 09:00 local

  it("reads a same-day deadline as Today", () => {
    expect(deadlineLabel("2026-08-14", today)).toBe("Today");
  });

  it("reads yesterday's deadline as Yesterday", () => {
    expect(deadlineLabel("2026-08-13", today)).toBe("Yesterday");
  });

  it("reads tomorrow's deadline as 'In 1 day', singular", () => {
    expect(deadlineLabel("2026-08-15", today)).toBe("In 1 day");
  });

  it("reads a deadline a few days out as plural", () => {
    expect(deadlineLabel("2026-08-19", today)).toBe("In 5 days");
  });

  it("reads a deadline a few days past", () => {
    expect(deadlineLabel("2026-08-10", today)).toBe("4 days ago");
  });

  it("caps a far-future deadline at 99+ days", () => {
    expect(deadlineLabel("2026-12-25", today)).toBe("In 99+ days");
  });

  it("caps a long-stale deadline at 99+ days ago", () => {
    expect(deadlineLabel("2026-01-01", today)).toBe("99+ days ago");
  });

  it("reads Today for a late-evening 'today', not tomorrow", () => {
    // The boundary bug this file's local-date handling exists to prevent:
    // a naive UTC-based diff can roll late-evening local time into the next
    // UTC day and misreport a same-day deadline as "In 1 day".
    const lateEvening = new Date(2026, 7, 14, 23, 45);
    expect(deadlineLabel("2026-08-14", lateEvening)).toBe("Today");
  });

  it("reads Today for an early-morning 'today', not yesterday", () => {
    const earlyMorning = new Date(2026, 7, 14, 0, 15);
    expect(deadlineLabel("2026-08-14", earlyMorning)).toBe("Today");
  });
});

describe("deadlineUrgency", () => {
  const today = new Date(2026, 7, 14); // Aug 14 2026

  it("calls a passed deadline past", () => {
    expect(deadlineUrgency("2026-08-13", today)).toBe("past");
  });

  it("calls today's deadline near, not past", () => {
    expect(deadlineUrgency("2026-08-14", today)).toBe("near");
  });

  // The boundary itself, both sides. The lead time is the app's own default,
  // so a deadline exactly that far out is the last one that still counts as
  // approaching — off-by-one here is the difference between a calm list and
  // one that shouts a week early.
  it("includes the lead day itself", () => {
    const lastNear = new Date(2026, 7, 14 + DEADLINE_NEAR_DAYS);
    expect(deadlineUrgency(formatDay(lastNear), today)).toBe("near");
  });

  it("calls the day after the lead window far", () => {
    const firstFar = new Date(2026, 7, 14 + DEADLINE_NEAR_DAYS + 1);
    expect(deadlineUrgency(formatDay(firstFar), today)).toBe("far");
  });

  it("calls a distant deadline far", () => {
    expect(deadlineUrgency("2026-12-25", today)).toBe("far");
  });
});

describe("deadlineCount", () => {
  const today = new Date(2026, 7, 14);

  it("is 0 on the day itself", () => {
    expect(deadlineCount("2026-08-14", today)).toBe("0");
  });

  it("counts days remaining", () => {
    expect(deadlineCount("2026-08-19", today)).toBe("5");
  });

  // A minus sign, not a hyphen, and it is what tells "6 days away" apart from
  // "6 days gone" — colour cannot, since both are red.
  it("signs a passed deadline with a true minus", () => {
    expect(deadlineCount("2026-08-10", today)).toBe("−4");
    expect(deadlineCount("2026-08-10", today).startsWith("−")).toBe(true);
  });

  it("clamps a far-future deadline so the row cannot widen", () => {
    expect(deadlineCount("2026-12-25", today)).toBe("99+");
  });

  it("clamps a long-stale deadline the same way", () => {
    expect(deadlineCount("2026-01-01", today)).toBe("−99+");
  });
});

describe("deadlineUrgency with a custom lead time", () => {
  const today = new Date(2026, 7, 14);

  // The extension's own preference: the iPhone's setting lives in that app's
  // UserDefaults.standard, outside the App Group and unsynced, so nothing here
  // can read it. A longer lead time must widen the red window, not be ignored.
  it("honours a longer lead time", () => {
    expect(deadlineUrgency("2026-08-26", today)).toBe("far");
    expect(deadlineUrgency("2026-08-26", today, 14)).toBe("near");
  });

  it("honours a shorter lead time", () => {
    expect(deadlineUrgency("2026-08-19", today)).toBe("near");
    expect(deadlineUrgency("2026-08-19", today, 2)).toBe("far");
  });

  // Whatever the lead time, a missed deadline is still missed.
  it("leaves a passed deadline past at any lead time", () => {
    expect(deadlineUrgency("2026-08-13", today, 1)).toBe("past");
    expect(deadlineUrgency("2026-08-13", today, 90)).toBe("past");
  });
});
