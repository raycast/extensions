import { beforeEach, describe, expect, it, vi } from "vitest";

// One test (or group) per extension preference: set it, build settings, check what it changes downstream.
const prefs = vi.hoisted(() => ({ values: {} as Record<string, unknown>, stored: {} as Record<string, string> }));
vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => prefs.values,
  LocalStorage: { getItem: async (key: string) => prefs.stored[key] },
  environment: {},
}));

import { buildSettings, loadSettings, LocationMissingError, Settings } from "./settings";
import { getDaySchedule, getReferenceTimes, PrayerSlot } from "./prayers";
import { alarmTimes, planReminders } from "./plan";
import { menuBarState } from "./state";
import { StoredLocation } from "./location";

// Tests run with TZ=Asia/Karachi. Thursday 8 and Friday 9 October 2026 in Karachi.
const karachi: StoredLocation = { mode: "city", latitude: 24.8607, longitude: 67.0011, label: "Karachi, Pakistan" };
const at = (h: number, m: number, day = 8) => new Date(2026, 9, day, h, m);
const hm = (date: Date | undefined) =>
  date ? `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}` : undefined;
const MINUTE = 60_000;

function settingsWith(values: Record<string, unknown>): Settings {
  prefs.values = values;
  return buildSettings(karachi);
}
function day(values: Record<string, unknown>, date = at(12, 0)): PrayerSlot[] {
  return getDaySchedule(date, settingsWith(values).schedule);
}
const byKey = (slots: PrayerSlot[], key: string) => slots.find((s) => s.key === key)!;

beforeEach(() => {
  prefs.values = {};
  prefs.stored = {};
});

describe("location", () => {
  it("is required before anything is calculated", async () => {
    await expect(loadSettings()).rejects.toBeInstanceOf(LocationMissingError);
  });

  it("is read from storage and used for the schedule", async () => {
    prefs.stored.location = JSON.stringify(karachi);
    const s = await loadSettings();
    expect(s.location.label).toBe("Karachi, Pakistan");
    expect([s.schedule.latitude, s.schedule.longitude]).toEqual([24.8607, 67.0011]);
  });
});

describe("reference times", () => {
  it("line up with the prayer windows", () => {
    const s = settingsWith({ ishaEnd: "midnight" });
    const slots = getDaySchedule(at(12, 0), s.schedule);
    const [sunrise, midnight, lastThird] = getReferenceTimes(at(12, 0), s.schedule);
    expect(sunrise.at).toEqual(byKey(slots, "fajr").end);
    expect(midnight.at).toEqual(byKey(slots, "isha").end);
    expect(lastThird.at > midnight.at && lastThird.at < at(5, 11, 9)).toBe(true);
  });
});

describe("defaults (no preferences saved)", () => {
  it("match the manifest defaults", () => {
    const s = settingsWith({});
    expect(s.schedule).toMatchObject({
      method: "Karachi",
      madhab: "hanafi",
      ishaEnd: "midnight",
      dhuhrEnd: "shafiAsr",
    });
    expect(s.windows).toMatchObject({
      startWindowMinutes: 5,
      endingReminderMinutes: 30,
      jamaatReminderMinutes: 10,
      headsUpMinutes: 15,
      dueAt: "start",
    });
    expect(s.reminders).toEqual({ enabled: true, alarms: true, listName: "Prayer", cleanMissedAfterDays: 7 });
    expect(s.notify).toEqual({ banner: false, popup: false });
    expect(s.plan.days).toBe(14);
    expect(s.menuBarAlways).toBe(false);
    expect(s.warnings).toEqual([]);
  });
});

describe("method", () => {
  it("changes the Fajr and Isha angles", () => {
    const karachiIsha = byKey(day({ method: "Karachi" }), "isha").start;
    const mwlIsha = byKey(day({ method: "MuslimWorldLeague" }), "isha").start;
    expect(mwlIsha < karachiIsha).toBe(true); // MWL uses 17° for Isha, Karachi 18°
  });
});

describe("madhab", () => {
  it("puts Hanafi Asr later than Shafi'i Asr", () => {
    expect(hm(byKey(day({ madhab: "hanafi" }), "asr").start)).toBe("16:33");
    expect(byKey(day({ madhab: "shafi" }), "asr").start < at(16, 33)).toBe(true);
  });
});

describe("adjustments", () => {
  it("shifts each prayer by its own minutes", () => {
    const base = day({});
    const shifted = day({ adjustments: "2,0,-3,0,1" });
    const diff = (key: string) => (byKey(shifted, key).start.getTime() - byKey(base, key).start.getTime()) / MINUTE;
    expect(["fajr", "dhuhr", "asr", "maghrib", "isha"].map(diff)).toEqual([2, 0, -3, 0, 1]);
  });

  it("treats blank or unreadable parts as 0", () => {
    const base = day({});
    const shifted = day({ adjustments: "x,,5" });
    expect(byKey(shifted, "fajr").start).toEqual(byKey(base, "fajr").start);
    expect((byKey(shifted, "asr").start.getTime() - byKey(base, "asr").start.getTime()) / MINUTE).toBe(5);
  });
});

describe("ishaEnd", () => {
  it("ends Isha at Islamic midnight or at the next Fajr", () => {
    expect(hm(byKey(day({ ishaEnd: "midnight" }), "isha").end)).toBe("23:42");
    const toFajr = byKey(day({ ishaEnd: "fajr" }), "isha").end;
    expect([toFajr.getDate(), hm(toFajr)]).toEqual([9, "05:11"]);
  });
});

describe("dhuhrEndsAtShafiAsr", () => {
  it("ends Dhuhr at the Shafi'i Asr by default and when on", () => {
    for (const values of [{}, { dhuhrEndsAtShafiAsr: true }]) {
      const slots = day(values);
      expect(byKey(slots, "dhuhr").end < byKey(slots, "asr").start).toBe(true);
    }
  });

  it("ends Dhuhr when Asr starts when off", () => {
    const slots = day({ dhuhrEndsAtShafiAsr: false });
    expect(byKey(slots, "dhuhr").end).toEqual(byKey(slots, "asr").start);
  });
});

describe("jamaat rules, one prayer at a time", () => {
  const prefFor = {
    fajr: "jamaatFajr",
    dhuhr: "jamaatDhuhr",
    asr: "jamaatAsr",
    maghrib: "jamaatMaghrib",
    isha: "jamaatIsha",
  };
  const empty = { jamaatFajr: "", jamaatDhuhr: "", jamaatAsr: "", jamaatMaghrib: "", jamaatIsha: "" };

  for (const [key, pref] of Object.entries(prefFor)) {
    it(`${pref} sets only ${key}'s jamaat`, () => {
      const slots = day({ ...empty, [pref]: "+7" });
      for (const slot of slots) {
        if (slot.key === key) expect((slot.jamaat!.getTime() - slot.start.getTime()) / MINUTE).toBe(7);
        else expect(slot.jamaat).toBeUndefined();
      }
    });
  }

  it("reports an unreadable rule as a warning and drops that jamaat", () => {
    const s = settingsWith({ jamaatAsr: "4:45pm" });
    expect(s.warnings).toEqual(['Asr Jamaat "4:45pm" isn\'t a valid rule']);
    expect(byKey(getDaySchedule(at(12, 0), s.schedule), "asr").jamaat).toBeUndefined();
  });
});

describe("jamaatJumuah", () => {
  it("applies on Friday only", () => {
    const values = { jamaatDhuhr: "floor5+15", jamaatJumuah: "13:30" };
    expect(hm(byKey(day(values, at(12, 0, 9)), "dhuhr").jamaat)).toBe("13:30");
    expect(hm(byKey(day(values, at(12, 0, 8)), "dhuhr").jamaat)).toBe("12:35");
  });

  it("falls back to the Dhuhr rule when empty", () => {
    const friday = byKey(day({ jamaatDhuhr: "+20", jamaatJumuah: "" }, at(12, 0, 9)), "dhuhr");
    expect((friday.jamaat!.getTime() - friday.start.getTime()) / MINUTE).toBe(20);
  });
});

describe("dueAt", () => {
  it("dues reminders at the start or at jamaat, falling back to the start without one", () => {
    const values = { jamaatAsr: "16:50", jamaatMaghrib: "" };
    const start = settingsWith({ ...values, dueAt: "start" });
    const jamaat = settingsWith({ ...values, dueAt: "jamaat" });
    const planFor = (s: Settings) => planReminders(at(9, 0), s.schedule, { ...s.plan, days: 1 });
    expect(hm(new Date(planFor(start)[2].due))).toBe("16:33");
    expect(hm(new Date(planFor(jamaat)[2].due))).toBe("16:50");
    expect(hm(new Date(planFor(jamaat)[3].due))).toBe("18:12");
  });
});

describe("headsUpMinutes", () => {
  const asrAlarms = (value: unknown) => {
    const s = settingsWith({ headsUpMinutes: value, jamaatAsr: "" });
    const asr = byKey(getDaySchedule(at(12, 0), s.schedule), "asr");
    return { minutes: s.windows.headsUpMinutes, alarms: alarmTimes(asr, asr.start, s.plan).map(hm) };
  };

  it("adds a notification that many minutes before the due time", () => {
    expect(asrAlarms("10")).toEqual({ minutes: 10, alarms: ["16:23", "16:33", "17:42"] });
  });

  it("turns off at 0 and clamps negatives to 0", () => {
    expect(asrAlarms("0").alarms).toEqual(["16:33", "17:42"]);
    expect(asrAlarms("-5").minutes).toBe(0);
  });

  it("falls back to 15 when unreadable", () => {
    expect(asrAlarms("soon").minutes).toBe(15);
  });
});

describe("menu bar windows", () => {
  const kindAt = (values: Record<string, unknown>, time: Date) => {
    const s = settingsWith(values);
    const slots = getDaySchedule(at(12, 0), s.schedule);
    return menuBarState(slots, time, new Set(), s.windows, s.menuBarAlways)?.kind;
  };

  it("startWindowMinutes: how long a prayer counts as just started", () => {
    const values = { startWindowMinutes: "2", jamaatDhuhr: "" };
    expect(kindAt(values, at(12, 22))).toBe("start");
    expect(kindAt(values, at(12, 24))).toBe("pending");
  });

  it("endingReminderMinutes: when the ending countdown begins", () => {
    const values = { endingReminderMinutes: "60", jamaatAsr: "" };
    expect(kindAt(values, at(17, 13))).toBe("ending");
    expect(kindAt(values, at(17, 11))).toBe("pending");
  });

  it("jamaatReminderMinutes: when the jamaat countdown begins", () => {
    const values = { jamaatReminderMinutes: "20", jamaatAsr: "17:00" };
    expect(kindAt(values, at(16, 41))).toBe("jamaat");
    expect(kindAt(values, at(16, 39))).toBe("pending");
  });

  it("menuBarShowNext: shows the next prayer between prayers only when on", () => {
    const s = (on: boolean) => settingsWith({ menuBarShowNext: on });
    const slots = getDaySchedule(at(12, 0), s(false).schedule);
    const prayed = new Set(["2026-10-08/fajr"]);
    expect(menuBarState(slots, at(9, 0), prayed, s(false).windows, s(false).menuBarAlways)).toBeUndefined();
    expect(menuBarState(slots, at(9, 0), prayed, s(true).windows, s(true).menuBarAlways)?.kind).toBe("upcoming");
  });
});

describe("useReminders", () => {
  it("turns Apple Reminders off", () => {
    expect(settingsWith({ useReminders: false }).reminders.enabled).toBe(false);
    expect(settingsWith({ useReminders: true }).reminders.enabled).toBe(true);
  });
});

describe("alerts", () => {
  it.each([
    ["reminders", { alarms: true, banner: false, popup: false }],
    ["popup", { alarms: false, banner: false, popup: true }],
    ["both", { alarms: true, banner: false, popup: true }],
    ["banner", { alarms: false, banner: true, popup: false }],
    ["none", { alarms: false, banner: false, popup: false }],
  ])("%s", (value, expected) => {
    const s = settingsWith({ alerts: value });
    expect({ alarms: s.reminders.alarms, ...s.notify }).toEqual(expected);
  });
});

describe("remindersList", () => {
  it("trims the name and falls back to Prayer", () => {
    expect(settingsWith({ remindersList: "  Salah  " }).reminders.listName).toBe("Salah");
    expect(settingsWith({ remindersList: "   " }).reminders.listName).toBe("Prayer");
  });
});

describe("reminderTitles", () => {
  it("names prayers everywhere, falling back to English for missing entries", () => {
    const s = settingsWith({ reminderTitles: "فجر, ظہر ,عصر" });
    const slots = getDaySchedule(at(12, 0), s.schedule);
    expect(slots.map((slot) => slot.name)).toEqual(["فجر", "ظہر", "عصر", "Maghrib", "Isha"]);
    const titles = planReminders(at(9, 0), s.schedule, { ...s.plan, days: 1 }).map((r) => r.title);
    expect(titles).toEqual(["فجر", "ظہر", "عصر", "Maghrib", "Isha"]);
  });
});

describe("jumuahTitle", () => {
  it("names Friday's Dhuhr, defaulting to Jumu'ah", () => {
    expect(byKey(day({ jumuahTitle: "Juma" }, at(12, 0, 9)), "dhuhr").name).toBe("Juma");
    expect(byKey(day({ jumuahTitle: "" }, at(12, 0, 9)), "dhuhr").name).toBe("Jumu'ah");
    expect(byKey(day({ jumuahTitle: "Juma", reminderTitles: "a,ظہر" }, at(12, 0, 8)), "dhuhr").name).toBe("ظہر");
  });
});

describe("daysAhead", () => {
  it.each([
    ["3", 3],
    ["0", 1],
    ["100", 31],
    ["soon", 14],
  ])("%s → %i days", (value, days) => {
    const s = settingsWith({ daysAhead: value });
    expect(s.plan.days).toBe(days);
    expect(planReminders(at(9, 0), s.schedule, s.plan)).toHaveLength(days * 5);
  });
});

describe("cleanMissedAfterDays", () => {
  it.each([
    ["3", 3],
    ["0", 0],
    ["-1", 0],
    ["", 7],
  ])("%s → %i", (value, days) => {
    expect(settingsWith({ cleanMissedAfterDays: value }).reminders.cleanMissedAfterDays).toBe(days);
  });
});
