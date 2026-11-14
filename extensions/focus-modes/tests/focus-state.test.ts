import { describe, expect, it } from "vitest";
import {
  Assertions,
  ModeConfigurations,
  resolveFocusState,
  scheduleWindowStart,
  ScheduleTrigger,
} from "../src/focus-state";

// The Focus database counts seconds from 2001-01-01.
const DATABASE_EPOCH = 978307200;
const PERSONAL = "com.apple.focus.personal-time";
const WORK = "com.apple.focus.work";
const PERFORMANCE = "com.apple.donotdisturb.mode.guitarsfill";
const CHURCH = "com.apple.donotdisturb.mode.buildingcolumnsfill";
const DO_NOT_DISTURB = "com.apple.donotdisturb.mode.default";

// Local times, so the tests pass in any time zone. October 9, 2026 is a Friday.
const at = (day: number, hour: number, minute: number, second = 0) => new Date(2026, 9, day, hour, minute, second);
const databaseTime = (date: Date) => date.getTime() / 1000 - DATABASE_EPOCH;

const schedule = (start: string, end: string, weekdays: number, enabledSetting = 2): ScheduleTrigger => {
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  return {
    class: "DNDModeConfigurationScheduleTrigger",
    enabledSetting,
    timePeriodStartTimeHour: startHour,
    timePeriodStartTimeMinute: startMinute,
    timePeriodEndTimeHour: endHour,
    timePeriodEndTimeMinute: endMinute,
    timePeriodWeekdays: weekdays,
  };
};

const FRIDAY = 16;
const SUNDAY = 64;
const EVERY_DAY = 127;

function configurations(performanceTriggers: ScheduleTrigger[] = []): ModeConfigurations {
  const mode = (id: string, name: string, triggers: ScheduleTrigger[] = []) => [
    id,
    { mode: { name, modeIdentifier: id }, triggers: { triggers } },
  ];
  return {
    data: [
      {
        modeConfigurations: Object.fromEntries([
          mode(PERSONAL, "Personal", [{ class: "DNDModeConfigurationSmartTrigger", enabledSetting: 0 }]),
          mode(WORK, "Work"),
          // A disabled schedule, like the one on the test Mac.
          mode(DO_NOT_DISTURB, "Do Not Disturb", [schedule("09:00", "17:00", EVERY_DAY, 0)]),
          mode(PERFORMANCE, "Performance", performanceTriggers),
          mode(CHURCH, "Church", [schedule("07:00", "12:00", SUNDAY)]),
        ]),
      },
    ],
  };
}

const assertion = (mode: string, start: Date) => ({
  assertionStartDateTimestamp: databaseTime(start),
  assertionDetails: { assertionDetailsModeIdentifier: mode },
});
const turnedOff = (date: Date) => ({
  invalidationRequestDateTimestamp: databaseTime(date),
  invalidationRequestPredicate: { invalidationPredicateType: "any" },
});
const assertions = (
  records: ReturnType<typeof assertion>[] = [],
  requests: ReturnType<typeof turnedOff>[] = [],
): Assertions => ({ data: [{ storeAssertionRecords: records, storeInvalidationRequestRecords: requests }] });

const activeId = (config: ModeConfigurations, store: Assertions, now: Date) =>
  resolveFocusState(config, store, now).activeId;

describe("resolveFocusState", () => {
  it("lists Do Not Disturb first, then the rest alphabetically", () => {
    const names = resolveFocusState(configurations(), assertions(), at(9, 10, 0)).modes.map((mode) => mode.name);
    expect(names).toEqual(["Do Not Disturb", "Church", "Performance", "Personal", "Work"]);
  });

  it("uses the newest assertion when no schedule is open", () => {
    const store = assertions([assertion(PERSONAL, at(9, 7, 0)), assertion(WORK, at(9, 7, 30))]);
    expect(activeId(configurations(), store, at(9, 7, 45))).toBe(WORK);
  });

  it("reports nothing on without assertions or open schedules", () => {
    expect(activeId(configurations(), assertions(), at(9, 7, 45))).toBeUndefined();
  });

  // Observed on macOS 26.6: a time schedule turned Performance on while a Smart Activation
  // assertion for Personal stayed in Assertions.json, and no assertion was added for Performance.
  it("prefers a schedule that started after the newest assertion", () => {
    const store = assertions([assertion(PERSONAL, at(9, 7, 0, 1))]);
    expect(activeId(configurations([schedule("07:52", "19:54", FRIDAY)]), store, at(9, 7, 53))).toBe(PERFORMANCE);
  });

  // Observed on macOS 26.6: turning the scheduled Focus off recorded an "any" invalidation request.
  it("keeps a schedule off after Focus was turned off during its window", () => {
    const store = assertions([], [turnedOff(at(9, 7, 54, 13))]);
    expect(activeId(configurations([schedule("07:52", "19:54", FRIDAY)]), store, at(9, 7, 55))).toBeUndefined();
  });

  it("ignores an assertion left over from before Focus was turned off", () => {
    const store = assertions([assertion(PERSONAL, at(9, 7, 0, 1))], [turnedOff(at(9, 7, 54, 13))]);
    expect(activeId(configurations([schedule("07:52", "19:54", FRIDAY)]), store, at(9, 7, 55))).toBeUndefined();
  });

  it("counts a Focus turned on after, or in the same moment as, a turn-off", () => {
    const store = (start: Date) => assertions([assertion(WORK, start)], [turnedOff(at(9, 8, 0))]);
    expect(activeId(configurations(), store(at(9, 8, 5)), at(9, 8, 10))).toBe(WORK);
    expect(activeId(configurations(), store(at(9, 8, 0)), at(9, 8, 10))).toBe(WORK);
  });

  it("brings the schedule back in its next window after being turned off", () => {
    const store = assertions([], [turnedOff(at(9, 7, 54))]);
    expect(activeId(configurations([schedule("07:52", "19:54", FRIDAY)]), store, at(16, 8, 0))).toBe(PERFORMANCE);
  });

  it("prefers a Focus turned on manually during a schedule", () => {
    const store = assertions([assertion(WORK, at(9, 8, 0))]);
    expect(activeId(configurations([schedule("07:52", "19:54", FRIDAY)]), store, at(9, 8, 5))).toBe(WORK);
  });

  it("ignores disabled schedules", () => {
    expect(activeId(configurations(), assertions(), at(9, 10, 0))).toBeUndefined();
  });

  it("only applies a schedule on its weekdays, with an exclusive end time", () => {
    expect(activeId(configurations(), assertions(), at(11, 9, 0))).toBe(CHURCH); // Sunday
    expect(activeId(configurations(), assertions(), at(10, 9, 0))).toBeUndefined(); // Saturday
    expect(activeId(configurations(), assertions(), at(11, 12, 0))).toBeUndefined();
  });

  it("handles missing database files", () => {
    expect(resolveFocusState(undefined, undefined, at(9, 10, 0))).toEqual({ modes: [], activeId: undefined });
  });
});

describe("scheduleWindowStart", () => {
  const fridayNight = schedule("22:00", "06:00", FRIDAY);

  it("starts an overnight window on the selected day", () => {
    expect(scheduleWindowStart(fridayNight, at(9, 23, 0))).toEqual(at(9, 22, 0));
  });

  it("keeps an overnight window open past midnight", () => {
    expect(scheduleWindowStart(fridayNight, at(10, 5, 59))).toEqual(at(9, 22, 0));
    expect(scheduleWindowStart(fridayNight, at(10, 6, 0))).toBeUndefined();
  });

  it("doesn't open an overnight window on unselected days", () => {
    expect(scheduleWindowStart(fridayNight, at(10, 23, 0))).toBeUndefined(); // Saturday night
    expect(scheduleWindowStart(fridayNight, at(9, 5, 0))).toBeUndefined(); // Thursday's night
  });

  it("returns the start of a same-day window", () => {
    expect(scheduleWindowStart(schedule("07:52", "19:54", FRIDAY), at(9, 12, 0))).toEqual(at(9, 7, 52));
    expect(scheduleWindowStart(schedule("07:52", "19:54", FRIDAY), at(9, 7, 51))).toBeUndefined();
  });
});
