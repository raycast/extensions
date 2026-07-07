import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  computeNextRun,
  describeSchedule,
  describeSchedules,
} from "./schedule";
import { CalendarSchedule, IntervalSchedule } from "../api/types";

const cal = (s: Omit<CalendarSchedule, "type">): CalendarSchedule => ({
  type: "calendar",
  ...s,
});
const iv = (seconds: number): IntervalSchedule => ({
  type: "interval",
  seconds,
});

describe("computeNextRun", () => {
  beforeEach(() => {
    // Wednesday, June 5 2024, 12:00:00 local
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 5, 5, 12, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  describe("calendar schedule", () => {
    it("computes today's run if it hasn't passed", () => {
      const next = computeNextRun(cal({ Hour: 14, Minute: 30 }));
      expect(next).toEqual(new Date(2024, 5, 5, 14, 30, 0, 0));
    });

    it("rolls to tomorrow if today's run has passed", () => {
      const next = computeNextRun(cal({ Hour: 9, Minute: 0 }));
      expect(next).toEqual(new Date(2024, 5, 6, 9, 0, 0, 0));
    });

    it("handles weekday 0 (Sunday)", () => {
      const next = computeNextRun(cal({ Weekday: 0, Hour: 8 }));
      // Wed → Sunday is +4 days
      expect(next).toEqual(new Date(2024, 5, 9, 8, 0, 0, 0));
    });

    it("handles weekday 7 (launchd Sunday)", () => {
      const next = computeNextRun(cal({ Weekday: 7, Hour: 8 }));
      expect(next).toEqual(new Date(2024, 5, 9, 8, 0, 0, 0));
    });

    it("clamps day-of-month overflow (Day=31 in April)", () => {
      vi.setSystemTime(new Date(2024, 3, 15, 12, 0, 0)); // Apr 15
      const next = computeNextRun(cal({ Day: 31, Hour: 0 }));
      expect(next).toEqual(new Date(2024, 3, 30, 0, 0, 0, 0));
    });

    it("rolls monthly schedule when this month already passed", () => {
      vi.setSystemTime(new Date(2024, 0, 20, 12, 0, 0)); // Jan 20
      const next = computeNextRun(cal({ Day: 15, Hour: 0 }));
      expect(next).toEqual(new Date(2024, 1, 15, 0, 0, 0, 0));
    });
  });

  describe("interval schedule", () => {
    it("returns lastRun + interval when given a lastRun", () => {
      const lastRun = new Date(2024, 5, 5, 11, 59, 0);
      const next = computeNextRun(iv(60), lastRun);
      expect(next).toEqual(new Date(2024, 5, 5, 12, 0, 0, 0));
    });

    it("falls back to now + interval when no lastRun", () => {
      const next = computeNextRun(iv(300));
      expect(next).toEqual(new Date(2024, 5, 5, 12, 5, 0, 0));
    });
  });
});

describe("describeSchedule", () => {
  describe("calendar", () => {
    it("describes daily schedule", () => {
      expect(describeSchedule(cal({ Hour: 9, Minute: 30 }))).toBe(
        "Daily at 9:30 AM",
      );
    });

    it("describes weekday schedule with Weekday=0", () => {
      expect(describeSchedule(cal({ Weekday: 0, Hour: 14 }))).toBe(
        "Every Sunday at 2:00 PM",
      );
    });

    it("describes weekday schedule with Weekday=7 as Sunday", () => {
      expect(describeSchedule(cal({ Weekday: 7, Hour: 14 }))).toBe(
        "Every Sunday at 2:00 PM",
      );
    });

    it("describes monthly schedule", () => {
      expect(describeSchedule(cal({ Day: 1, Hour: 0 }))).toBe(
        "Monthly on day 1 at 12:00 AM",
      );
    });
  });

  describe("interval", () => {
    it("describes seconds intervals", () => {
      expect(describeSchedule(iv(30))).toBe("Every 30 seconds");
    });

    it("describes a 1-second interval (singular)", () => {
      expect(describeSchedule(iv(1))).toBe("Every second");
    });

    it("describes minute intervals", () => {
      expect(describeSchedule(iv(60))).toBe("Every minute");
      expect(describeSchedule(iv(300))).toBe("Every 5 minutes");
    });

    it("describes hour intervals", () => {
      expect(describeSchedule(iv(3600))).toBe("Every hour");
      expect(describeSchedule(iv(7200))).toBe("Every 2 hours");
    });

    it("falls back to seconds for non-clean values", () => {
      expect(describeSchedule(iv(90))).toBe("Every 90 seconds");
    });
  });
});

describe("describeSchedules", () => {
  it("compacts Mon–Fri into 'Every weekday'", () => {
    const schedules = [1, 2, 3, 4, 5].map((d) => cal({ Weekday: d, Hour: 9 }));
    expect(describeSchedules(schedules)).toBe("Every weekday at 9:00 AM");
  });

  it("compacts Sat+Sun into 'Every weekend'", () => {
    const schedules = [0, 6].map((d) => cal({ Weekday: d, Hour: 10 }));
    expect(describeSchedules(schedules)).toBe("Every weekend at 10:00 AM");
  });

  it("compacts all 7 days into 'Every day'", () => {
    const schedules = [0, 1, 2, 3, 4, 5, 6].map((d) =>
      cal({ Weekday: d, Hour: 7 }),
    );
    expect(describeSchedules(schedules)).toBe("Every day at 7:00 AM");
  });

  it("normalizes Weekday=7 (Sunday) when grouping", () => {
    const schedules = [7, 6].map((d) => cal({ Weekday: d, Hour: 10 }));
    expect(describeSchedules(schedules)).toBe("Every weekend at 10:00 AM");
  });

  it("renders contiguous ranges with an en dash", () => {
    const schedules = [1, 2, 3].map((d) => cal({ Weekday: d, Hour: 9 }));
    expect(describeSchedules(schedules)).toBe("Mon\u2013Wed at 9:00 AM");
  });

  it("renders non-contiguous days as a comma list", () => {
    const schedules = [1, 3, 5].map((d) => cal({ Weekday: d, Hour: 9 }));
    expect(describeSchedules(schedules)).toBe("Mon, Wed, Fri at 9:00 AM");
  });

  it("groups separately when times differ", () => {
    const schedules = [
      cal({ Weekday: 1, Hour: 9 }),
      cal({ Weekday: 2, Hour: 9 }),
      cal({ Weekday: 5, Hour: 17 }),
    ];
    expect(describeSchedules(schedules)).toBe(
      "Mon\u2013Tue at 9:00 AM; Fri at 5:00 PM",
    );
  });

  it("falls back to single-schedule description when no compaction applies", () => {
    expect(describeSchedules([cal({ Hour: 9 })])).toBe("Daily at 9:00 AM");
  });

  it("includes interval schedules alongside calendar groups", () => {
    expect(describeSchedules([iv(60), cal({ Hour: 0 })])).toBe(
      "Every minute; Daily at 12:00 AM",
    );
  });

  it("returns empty string for empty input", () => {
    expect(describeSchedules([])).toBe("");
  });
});
