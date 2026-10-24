import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeSuggestedSlots, mergeBusyPeriods } from "./suggest-time";

describe("suggest-time slot computation", () => {
  it("honors weekends, work hours, and busy periods", () => {
    const input = {
      timeMin: "2026-07-18T00:00:00Z",
      timeMax: "2026-07-20T15:00:00Z",
      durationMinutes: 60,
      timeZone: "UTC",
      workDayStart: "09:00",
      workDayEnd: "12:00",
      incrementMinutes: 30,
      maxSuggestions: 2,
    };
    const busy = [{ start: Date.parse("2026-07-20T09:00:00Z"), end: Date.parse("2026-07-20T10:00:00Z") }];

    assert.deepEqual(
      computeSuggestedSlots(input, busy).map((slot) => slot.start),
      ["2026-07-20T10:00:00.000Z", "2026-07-20T10:30:00.000Z"],
    );
    assert.equal(computeSuggestedSlots({ ...input, includeWeekends: true }, busy)[0].start, "2026-07-18T09:00:00.000Z");
  });

  it("treats touching and overlapping busy periods as one block", () => {
    assert.deepEqual(
      mergeBusyPeriods([
        { start: 20, end: 30 },
        { start: 0, end: 10 },
        { start: 10, end: 25 },
      ]),
      [{ start: 0, end: 30 }],
    );
  });

  it("uses the correct UTC offset on both sides of DST", () => {
    const common = {
      durationMinutes: 60,
      timeZone: "America/New_York",
      workDayStart: "09:00",
      workDayEnd: "10:00",
      maxSuggestions: 1,
    };
    const summer = computeSuggestedSlots(
      { ...common, timeMin: "2026-07-20T00:00:00Z", timeMax: "2026-07-21T00:00:00Z" },
      [],
    );
    const winter = computeSuggestedSlots(
      { ...common, timeMin: "2026-12-07T00:00:00Z", timeMax: "2026-12-08T00:00:00Z" },
      [],
    );
    assert.equal(summer[0].start, "2026-07-20T13:00:00.000Z");
    assert.equal(winter[0].start, "2026-12-07T14:00:00.000Z");
  });

  it("rejects invalid work hours and time zones", () => {
    const input = {
      timeMin: "2026-07-20T00:00:00Z",
      timeMax: "2026-07-21T00:00:00Z",
      durationMinutes: 30,
      timeZone: "UTC",
    };
    assert.throws(() => computeSuggestedSlots({ ...input, workDayStart: "9am" }, []), /HH:mm/);
    assert.throws(
      () => computeSuggestedSlots({ ...input, workDayStart: "17:00", workDayEnd: "09:00" }, []),
      /must be after/,
    );
    assert.throws(() => computeSuggestedSlots({ ...input, timeZone: "Mars/Olympus" }, []), /Invalid IANA/);
  });
});
