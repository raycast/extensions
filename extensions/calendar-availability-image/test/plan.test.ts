import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPlan, firstMonday, isoWeek, rangeFor, subtract, union } from "../src/lib/plan";
import { BusyEvent } from "../src/lib/types";
import { local, options, spans, stamp } from "./helpers";

const MONDAY_EARLY = local(2026, 11, 9, 7, 0);

function busy(day: number, from: [number, number], to: [number, number], extra: Partial<BusyEvent> = {}): BusyEvent {
  return {
    start: local(2026, 11, day, from[0], from[1]).getTime(),
    end: local(2026, 11, day, to[0], to[1]).getTime(),
    tentative: false,
    allDay: false,
    ...extra,
  };
}

describe("union", () => {
  it("merges overlapping and touching intervals", () => {
    assert.deepEqual(
      union([
        { start: 5, end: 8 },
        { start: 0, end: 3 },
        { start: 3, end: 4 },
        { start: 6, end: 10 },
      ]),
      [
        { start: 0, end: 4 },
        { start: 5, end: 10 },
      ],
    );
  });

  it("swallows contained intervals and does not mutate the input", () => {
    const input = [
      { start: 0, end: 10 },
      { start: 2, end: 3 },
    ];
    assert.deepEqual(union(input), [{ start: 0, end: 10 }]);
    assert.deepEqual(input[1], { start: 2, end: 3 });
  });

  it("returns an empty list for no input", () => {
    assert.deepEqual(union([]), []);
  });
});

describe("subtract", () => {
  it("cuts holes into an interval", () => {
    assert.deepEqual(
      subtract(
        [{ start: 0, end: 10 }],
        [
          { start: 2, end: 3 },
          { start: 5, end: 7 },
        ],
      ),
      [
        { start: 0, end: 2 },
        { start: 3, end: 5 },
        { start: 7, end: 10 },
      ],
    );
  });

  it("handles cuts that reach over the edges", () => {
    assert.deepEqual(
      subtract(
        [{ start: 2, end: 8 }],
        [
          { start: 0, end: 3 },
          { start: 7, end: 12 },
        ],
      ),
      [{ start: 3, end: 7 }],
    );
  });

  it("returns nothing when fully covered and everything when untouched", () => {
    assert.deepEqual(subtract([{ start: 2, end: 8 }], [{ start: 0, end: 10 }]), []);
    assert.deepEqual(subtract([{ start: 2, end: 8 }], [{ start: 8, end: 10 }]), [{ start: 2, end: 8 }]);
  });
});

describe("firstMonday", () => {
  it("returns the Monday of the current week on weekdays", () => {
    assert.equal(stamp(firstMonday(local(2026, 11, 9, 0, 0), false).getTime()), "2026-11-09 00:00");
    assert.equal(stamp(firstMonday(local(2026, 11, 13, 17, 45), false).getTime()), "2026-11-09 00:00");
  });

  it("jumps to the next Monday on weekends when the weekend is hidden", () => {
    assert.equal(stamp(firstMonday(local(2026, 11, 14, 10, 0), false).getTime()), "2026-11-16 00:00");
    assert.equal(stamp(firstMonday(local(2026, 11, 15, 23, 59), false).getTime()), "2026-11-16 00:00");
  });

  it("stays in the current week on weekends when the weekend is shown", () => {
    assert.equal(stamp(firstMonday(local(2026, 11, 14, 10, 0), true).getTime()), "2026-11-09 00:00");
    assert.equal(stamp(firstMonday(local(2026, 11, 15, 10, 0), true).getTime()), "2026-11-09 00:00");
  });

  it("crosses month and year boundaries", () => {
    assert.equal(stamp(firstMonday(local(2027, 1, 1, 12, 0), false).getTime()), "2026-12-28 00:00");
  });
});

describe("rangeFor", () => {
  it("spans the configured number of weeks", () => {
    const { start, end } = rangeFor(local(2026, 11, 11, 9, 0), options({ weeks: 3 }));
    assert.equal(stamp(start.getTime()), "2026-11-09 00:00");
    assert.equal(stamp(end.getTime()), "2026-11-30 00:00");
  });

  it("ends at local midnight across the end of daylight saving time", () => {
    const { start, end } = rangeFor(local(2026, 10, 20, 9, 0), options({ weeks: 2 }));
    assert.equal(stamp(start.getTime()), "2026-10-19 00:00");
    assert.equal(stamp(end.getTime()), "2026-11-02 00:00");
  });
});

describe("isoWeek", () => {
  it("returns ISO 8601 week numbers", () => {
    assert.equal(isoWeek(local(2026, 11, 10)), 46);
    assert.equal(isoWeek(local(2026, 1, 1)), 1);
    assert.equal(isoWeek(local(2026, 12, 31)), 53);
    assert.equal(isoWeek(local(2027, 1, 3)), 53);
    assert.equal(isoWeek(local(2027, 1, 4)), 1);
    assert.equal(isoWeek(local(2024, 12, 30)), 1);
  });
});

describe("buildPlan", () => {
  it("creates five days per week by default and seven with the weekend", () => {
    const weeks = buildPlan([], MONDAY_EARLY, options({ weeks: 2 }));
    assert.deepEqual(
      weeks.map((w) => w.length),
      [5, 5],
    );
    assert.equal(stamp(weeks[0][0].date.getTime()), "2026-11-09 00:00");
    assert.equal(stamp(weeks[1][4].date.getTime()), "2026-11-20 00:00");

    const withWeekend = buildPlan([], MONDAY_EARLY, options({ includeWeekend: true }));
    assert.equal(withWeekend[0].length, 7);
    assert.equal(stamp(withWeekend[0][6].date.getTime()), "2026-11-15 00:00");
  });

  it("marks a day without events as one free slot over the working hours", () => {
    const [day] = buildPlan([], MONDAY_EARLY, options())[0];
    assert.deepEqual(spans(day.free), ["08:00-18:00"]);
    assert.deepEqual(day.busy, []);
    assert.equal(day.past, null);
  });

  it("uses the configured working hours", () => {
    const [day] = buildPlan([], MONDAY_EARLY, options({ startHour: 9, endHour: 17 }))[0];
    assert.deepEqual(spans(day.free), ["09:00-17:00"]);
  });

  it("splits free time around busy events and merges overlapping ones", () => {
    const events = [busy(9, [9, 0], [10, 0]), busy(9, [9, 30], [11, 0]), busy(9, [14, 0], [15, 0])];
    const [day] = buildPlan(events, MONDAY_EARLY, options())[0];
    assert.deepEqual(spans(day.busy), ["09:00-11:00", "14:00-15:00"]);
    assert.deepEqual(spans(day.free), ["08:00-09:00", "11:00-14:00", "15:00-18:00"]);
  });

  it("only assigns events to the day they happen on", () => {
    const week = buildPlan([busy(10, [9, 0], [10, 0])], MONDAY_EARLY, options())[0];
    assert.deepEqual(spans(week[0].free), ["08:00-18:00"]);
    assert.deepEqual(spans(week[1].free), ["08:00-09:00", "10:00-18:00"]);
  });

  it("clips events to the working hours", () => {
    const events = [busy(9, [6, 0], [8, 30]), busy(9, [17, 0], [20, 0]), busy(9, [5, 0], [7, 0])];
    const [day] = buildPlan(events, MONDAY_EARLY, options())[0];
    assert.deepEqual(spans(day.busy), ["08:00-08:30", "17:00-18:00"]);
    assert.deepEqual(spans(day.free), ["08:30-17:00"]);
  });

  it("drops free gaps shorter than the minimum slot length", () => {
    const events = [busy(9, [9, 0], [10, 0]), busy(9, [10, 20], [11, 0]), busy(9, [11, 30], [12, 0])];
    const [day] = buildPlan(events, MONDAY_EARLY, options({ minSlotMinutes: 30 }))[0];
    assert.deepEqual(spans(day.free), ["08:00-09:00", "11:00-11:30", "12:00-18:00"]);

    const [strict] = buildPlan(events, MONDAY_EARLY, options({ minSlotMinutes: 60 }))[0];
    assert.deepEqual(spans(strict.free), ["08:00-09:00", "12:00-18:00"]);
  });

  it("blocks tentative events when they count as busy", () => {
    const events = [busy(9, [10, 0], [11, 0], { tentative: true })];
    const [day] = buildPlan(events, MONDAY_EARLY, options({ tentativeIsBusy: true }))[0];
    assert.deepEqual(spans(day.tentative), ["10:00-11:00"]);
    assert.deepEqual(day.busy, []);
    assert.deepEqual(spans(day.free), ["08:00-10:00", "11:00-18:00"]);
  });

  it("ignores tentative events when they do not count as busy", () => {
    const events = [busy(9, [10, 0], [11, 0], { tentative: true })];
    const [day] = buildPlan(events, MONDAY_EARLY, options({ tentativeIsBusy: false }))[0];
    assert.deepEqual(day.tentative, []);
    assert.deepEqual(spans(day.free), ["08:00-18:00"]);
  });

  it("shows only the part of a tentative event that is not already busy", () => {
    const events = [busy(9, [10, 0], [12, 0], { tentative: true }), busy(9, [11, 0], [13, 0])];
    const [day] = buildPlan(events, MONDAY_EARLY, options())[0];
    assert.deepEqual(spans(day.busy), ["11:00-13:00"]);
    assert.deepEqual(spans(day.tentative), ["10:00-11:00"]);
  });

  it("blocks the whole day for an all-day event", () => {
    const allDay: BusyEvent = {
      start: local(2026, 11, 10).getTime(),
      end: local(2026, 11, 11).getTime(),
      tentative: false,
      allDay: true,
    };
    const week = buildPlan([allDay], MONDAY_EARLY, options())[0];
    assert.deepEqual(week[1].free, []);
    assert.deepEqual(spans(week[1].busy), ["08:00-18:00"]);
    assert.deepEqual(spans(week[0].free), ["08:00-18:00"]);
    assert.deepEqual(spans(week[2].free), ["08:00-18:00"]);
  });

  it("splits an event over midnight across both days", () => {
    const overnight: BusyEvent = {
      start: local(2026, 11, 9, 16, 0).getTime(),
      end: local(2026, 11, 10, 9, 0).getTime(),
      tentative: false,
      allDay: false,
    };
    const week = buildPlan([overnight], MONDAY_EARLY, options())[0];
    assert.deepEqual(spans(week[0].free), ["08:00-16:00"]);
    assert.deepEqual(spans(week[1].free), ["09:00-18:00"]);
  });

  describe("current day", () => {
    it("starts free time at the next quarter hour", () => {
      const week = buildPlan([], local(2026, 11, 10, 10, 20), options())[0];
      assert.deepEqual(spans(week[1].free), ["10:30-18:00"]);
      assert.deepEqual(spans([week[1].past!]), ["08:00-10:30"]);
    });

    it("does not round when the time is exactly on a quarter hour", () => {
      const week = buildPlan([], local(2026, 11, 10, 10, 15), options())[0];
      assert.deepEqual(spans(week[1].free), ["10:15-18:00"]);
    });

    it("marks earlier days as fully past and leaves later days untouched", () => {
      const week = buildPlan([], local(2026, 11, 10, 10, 20), options())[0];
      assert.deepEqual(week[0].free, []);
      assert.deepEqual(spans([week[0].past!]), ["08:00-18:00"]);
      assert.equal(week[2].past, null);
      assert.deepEqual(spans(week[2].free), ["08:00-18:00"]);
    });

    it("has no past before the working hours start", () => {
      const week = buildPlan([], local(2026, 11, 10, 6, 0), options())[0];
      assert.equal(week[1].past, null);
      assert.deepEqual(spans(week[1].free), ["08:00-18:00"]);
    });

    it("has no free time after the working hours end", () => {
      const week = buildPlan([], local(2026, 11, 10, 18, 0), options())[0];
      assert.deepEqual(week[1].free, []);
    });

    it("drops the remaining slot when it is shorter than the minimum", () => {
      const week = buildPlan([], local(2026, 11, 10, 17, 40), options({ minSlotMinutes: 30 }))[0];
      assert.deepEqual(week[1].free, []);
    });
  });

  describe("daylight saving time", () => {
    it("keeps working hours at local time when the clocks go back", () => {
      const week = buildPlan([], local(2026, 10, 19, 7, 0), options({ includeWeekend: true }))[0];
      const sunday = week[6];
      assert.equal(stamp(sunday.windowStart), "2026-10-25 08:00");
      assert.equal(stamp(sunday.windowEnd), "2026-10-25 18:00");
      assert.equal(sunday.windowEnd - sunday.windowStart, 10 * 3600 * 1000);
    });

    it("keeps working hours at local time when the clocks go forward", () => {
      const week = buildPlan([], local(2026, 3, 23, 7, 0), options({ includeWeekend: true }))[0];
      const sunday = week[6];
      assert.equal(stamp(sunday.windowStart), "2026-03-29 08:00");
      assert.equal(stamp(sunday.windowEnd), "2026-03-29 18:00");
    });

    it("places the days of the following week correctly", () => {
      const weeks = buildPlan([], local(2026, 10, 19, 7, 0), options({ weeks: 2 }));
      assert.equal(stamp(weeks[1][0].windowStart), "2026-10-26 08:00");
      assert.equal(stamp(weeks[1][4].windowEnd), "2026-10-30 18:00");
    });
  });
});
