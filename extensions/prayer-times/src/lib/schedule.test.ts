import { describe, expect, it } from "vitest";
import { getDaySchedule, getTimeline, ScheduleConfig } from "./prayers";
import { alertsForSlot, AlertWindows, currentSlot, dueAlerts, menuBarState, nextSlot, passedAlertIds } from "./state";
import { alarmTimes, planHash, planReminders, PlanOptions } from "./plan";
import { fullDayStreak, summarize } from "./stats";
import { formatMinutes, menuBarTitle } from "./menubar-title";
import { ltrName } from "./format";

// Tests run with TZ=Asia/Karachi (see package.json), Karachi coordinates.
const config: ScheduleConfig = {
  latitude: 24.8607,
  longitude: 67.0011,
  method: "Karachi",
  madhab: "hanafi",
  adjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
  ishaEnd: "midnight",
  dhuhrEnd: "asr",
  jamaat: { fajr: "floor5+15", dhuhr: "floor5+15", asr: "floor5+15", maghrib: "+5", isha: "floor5+15" },
  jamaatJumuah: "13:30",
};

const windows: AlertWindows = {
  startWindowMinutes: 5,
  endingReminderMinutes: 30,
  jamaatReminderMinutes: 10,
  headsUpMinutes: 0,
  dueAt: "start",
};
const hm = (date: Date | undefined) =>
  date ? `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}` : undefined;
const at = (h: number, m: number, day = 8) => new Date(2026, 9, day, h, m);

describe("getDaySchedule", () => {
  const slots = getDaySchedule(at(12, 0), config);

  it("matches the Karachi/Hanafi timetable for 8 Oct 2026", () => {
    // Aladhan (method 1, school 1) gives 05:11 12:19 16:34 18:12 19:28; adhan adds +1 Dhuhr and rounds.
    expect(slots.map((s) => hm(s.start))).toEqual(["05:11", "12:21", "16:33", "18:12", "19:28"]);
  });

  it("ends each prayer when the next window starts", () => {
    expect(slots.map((s) => hm(s.end))).toEqual(["06:27", "16:33", "18:12", "19:28", "23:42"]);
  });

  it("applies jamaat rules", () => {
    expect(slots.map((s) => hm(s.jamaat))).toEqual(["05:25", "12:35", "16:45", "18:17", "19:40"]);
  });

  it("uses date/slug ids", () => {
    expect(slots.map((s) => s.id)).toEqual([
      "2026-10-08/fajr",
      "2026-10-08/dhuhr",
      "2026-10-08/asr",
      "2026-10-08/maghrib",
      "2026-10-08/isha",
    ]);
  });

  it("uses the Jumu'ah rule on Friday", () => {
    const friday = getDaySchedule(at(12, 0, 9), config);
    expect(friday[1].name).toBe("Jumu'ah");
    expect(hm(friday[1].jamaat)).toBe("13:30");
  });

  it("can end Dhuhr at the Shafi'i Asr while Asr stays Hanafi", () => {
    const shafiEnd = getDaySchedule(at(12, 0), { ...config, dhuhrEnd: "shafiAsr" });
    const shafiAsr = getDaySchedule(at(12, 0), { ...config, madhab: "shafi" })[2].start;
    expect(shafiEnd[1].end).toEqual(shafiAsr);
    expect(shafiEnd[1].end < shafiEnd[2].start).toBe(true);
    expect(hm(shafiEnd[2].start)).toBe("16:33");
  });

  it("can end Isha at Fajr", () => {
    const isha = getDaySchedule(at(12, 0), { ...config, ishaEnd: "fajr" })[4];
    expect(isha.end.getDate()).toBe(9);
    expect(hm(isha.end)).toBe("05:11");
  });
});

describe("timeline and alerts", () => {
  const slots = getTimeline(at(12, 0), config);
  const none = new Set<string>();

  it("finds current and next slots", () => {
    expect(currentSlot(slots, at(16, 40))?.id).toBe("2026-10-08/asr");
    expect(currentSlot(slots, at(9, 0))).toBeUndefined();
    expect(nextSlot(slots, at(9, 0))?.id).toBe("2026-10-08/dhuhr");
  });

  it("builds start, jamaat and ending alerts", () => {
    const asr = slots.find((s) => s.id === "2026-10-08/asr")!;
    expect(alertsForSlot(asr, windows).map((a) => [a.kind, hm(a.at)])).toEqual([
      ["start", "16:33"],
      ["jamaat", "16:35"],
      ["ending", "17:42"],
    ]);
  });

  it("adds a heads-up before the start or before jamaat", () => {
    const asr = slots.find((s) => s.id === "2026-10-08/asr")!;
    const withHeadsUp = { ...windows, headsUpMinutes: 15 };
    expect(alertsForSlot(asr, withHeadsUp)[0]).toMatchObject({ kind: "headsUp" });
    expect(hm(alertsForSlot(asr, withHeadsUp)[0].at)).toBe("16:18");
    expect(hm(alertsForSlot(asr, { ...withHeadsUp, dueAt: "jamaat" })[0].at)).toBe("16:30");
    // Dhuhr's ending reminder is due at the same time, so both fire.
    expect(dueAlerts(slots, at(16, 20), none, none, withHeadsUp).map((a) => a.id)).toEqual([
      "2026-10-08/dhuhr:ending",
      "2026-10-08/asr:headsUp",
    ]);
  });

  it("fires only the latest due alert per slot and skips fired ones", () => {
    expect(dueAlerts(slots, at(16, 36), none, none, windows).map((a) => a.id)).toEqual(["2026-10-08/asr:jamaat"]);
    expect(dueAlerts(slots, at(16, 36), none, new Set(["2026-10-08/asr:jamaat"]), windows)).toEqual([]);
  });

  it("skips jamaat and ending alerts once prayed", () => {
    expect(dueAlerts(slots, at(17, 50), new Set(["2026-10-08/asr"]), none, windows)).toEqual([]);
  });

  it("drops stale alerts after they expire", () => {
    expect(dueAlerts(slots, at(16, 50), none, none, windows)).toEqual([]);
  });
});

describe("menuBarState", () => {
  const slots = getTimeline(at(12, 0), config);
  const none = new Set<string>();
  const kind = (h: number, m: number, prayed = none, always = false) =>
    menuBarState(slots, at(h, m), prayed, windows, always)?.kind;

  it("shows the first minutes after start", () => expect(kind(12, 22)).toBe("start"));
  it("prefers the jamaat window", () => expect(kind(16, 36)).toBe("jamaat"));
  it("stays as pending between windows until prayed", () => {
    expect(kind(17, 0)).toBe("pending");
    expect(kind(17, 0, new Set(["2026-10-08/asr"]))).toBeUndefined();
  });
  it("shows the ending window until prayed", () => {
    expect(kind(17, 50)).toBe("ending");
    expect(kind(17, 50, new Set(["2026-10-08/asr"]))).toBeUndefined();
  });
  it("hides an unprayed prayer once its time ends, unless the next is close or always is on", () => {
    expect(menuBarState(slots, at(9, 0), none, windows, false)).toBeUndefined();
    expect(menuBarState(slots, at(9, 0), none, windows, true)).toMatchObject({
      kind: "upcoming",
      slot: { id: "2026-10-08/dhuhr" },
    });
    expect(menuBarState(slots, at(12, 22), none, windows, false)?.slot.id).toBe("2026-10-08/dhuhr");
  });
  it("shows the next prayer once prayed when always is on", () => {
    const prayed = new Set(["2026-10-08/fajr"]);
    expect(menuBarState(slots, at(9, 0), prayed, windows, true)).toMatchObject({
      kind: "upcoming",
      slot: { id: "2026-10-08/dhuhr" },
    });
    expect(menuBarState(slots, at(9, 0), prayed, windows, false)).toBeUndefined();
  });
});

describe("planReminders", () => {
  const options: PlanOptions = {
    dueAt: "start",
    headsUpMinutes: 15,
    windows,
    days: 14,
  };
  const named: ScheduleConfig = {
    ...config,
    names: { fajr: "فجر", dhuhr: "ظہر", asr: "عصر", maghrib: "مغرب", isha: "عشاء" },
    jumuahName: "جمعہ",
  };

  it("plans 14 days of 5 reminders keyed by date/slug with matching titles", () => {
    const plan = planReminders(at(9, 0), named, options);
    expect(plan).toHaveLength(70);
    expect(plan[0]).toMatchObject({ key: "2026-10-08/fajr", title: "فجر" });
    expect(plan[69].key).toBe("2026-10-21/isha");
  });

  it("titles Friday's Dhuhr for Jumu'ah, keeping the dhuhr key", () => {
    const friday = planReminders(at(9, 0, 9), named, { ...options, days: 1 });
    expect(friday[1]).toMatchObject({ key: "2026-10-09/dhuhr", title: "جمعہ" });
    const thursday = planReminders(at(9, 0, 8), named, { ...options, days: 1 });
    expect(thursday[1]).toMatchObject({ key: "2026-10-08/dhuhr", title: "ظہر" });
  });

  it("dues at start or at jamaat", () => {
    const asrStart = planReminders(at(9, 0), config, options)[2];
    const asrJamaat = planReminders(at(9, 0), config, { ...options, dueAt: "jamaat" })[2];
    expect(hm(new Date(asrStart.due))).toBe("16:33");
    expect(hm(new Date(asrJamaat.due))).toBe("16:45");
  });

  it("collects heads-up, start, jamaat and ending alarms without duplicates", () => {
    const asr = getDaySchedule(at(12, 0), config)[2];
    expect(alarmTimes(asr, asr.start, options).map(hm)).toEqual(["16:18", "16:33", "16:35", "17:42"]);
    expect(alarmTimes(asr, asr.start, { ...options, headsUpMinutes: 0 }).map(hm)).toEqual(["16:33", "16:35", "17:42"]);
  });

  it("hashes stably and changes when times change", () => {
    const a = planHash(planReminders(at(9, 0), config, options));
    expect(planHash(planReminders(at(10, 0), config, options))).toBe(a);
    expect(planHash(planReminders(at(9, 0), config, { ...options, headsUpMinutes: 10 }))).not.toBe(a);
  });
});

describe("stats", () => {
  const history = {
    "2026-10-06": {
      fajr: { completed: true, onTime: true },
      dhuhr: { completed: true, onTime: true },
      asr: { completed: true, onTime: true },
      maghrib: { completed: true, onTime: true },
      isha: { completed: true, onTime: false },
    },
    "2026-10-07": {
      fajr: { completed: true, onTime: true },
      dhuhr: { completed: true, onTime: true },
      asr: { completed: true, onTime: true },
      maghrib: { completed: true, onTime: true },
      isha: { completed: true, onTime: true },
    },
    "2026-10-05": { fajr: { completed: false, onTime: false } },
  };
  const dates = ["2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07"];

  it("leaves days without reminders out of the total", () => {
    expect(summarize(history, dates)).toMatchObject({ knownDays: 3, prayed: 10, total: 15, onTime: 9 });
  });

  it("counts the full-day streak back from the last day", () => {
    expect(fullDayStreak(history, dates)).toBe(2);
  });
});

describe("menuBarTitle", () => {
  const slots = getTimeline(at(12, 0), config);
  const asr = slots.find((s) => s.id === "2026-10-08/asr")!;
  const w = { ...windows, headsUpMinutes: 15 };

  it("formats minutes, switching to h:mm from an hour", () => {
    expect(formatMinutes(4.5 * 60_000, "ceil")).toBe("5");
    expect(formatMinutes(4.5 * 60_000, "floor")).toBe("4");
    expect(formatMinutes(65 * 60_000, "floor")).toBe("1:05");
  });

  it("counts down to the start, yellow inside the heads-up", () => {
    expect(menuBarTitle({ slot: asr, kind: "upcoming" }, at(16, 28), w)).toEqual({
      text: "Asr -5",
      tone: "yellow",
      mosque: false,
    });
    expect(menuBarTitle({ slot: asr, kind: "upcoming" }, at(15, 0), w)).toMatchObject({
      text: "Asr -1:33",
      tone: "plain",
    });
  });

  it("counts up after the start", () => {
    expect(menuBarTitle({ slot: asr, kind: "start" }, at(16, 38), w)).toMatchObject({ text: "Asr +5", tone: "green" });
    expect(menuBarTitle({ slot: asr, kind: "pending" }, at(17, 0), w)).toMatchObject({ text: "Asr +27", tone: "blue" });
  });

  it("shows the mosque for jamaat", () => {
    expect(menuBarTitle({ slot: asr, kind: "jamaat" }, at(16, 40), w)).toEqual({
      text: "Asr -5",
      tone: "green",
      mosque: true,
    });
    expect(menuBarTitle({ slot: asr, kind: "jamaat" }, at(16, 47), w)).toMatchObject({ text: "Asr +2", mosque: true });
  });

  it("brackets the time left in red", () => {
    expect(menuBarTitle({ slot: asr, kind: "ending" }, at(18, 7), w)).toMatchObject({
      text: "Asr (-5)",
      tone: "red",
    });
  });

  it("keeps an Urdu name on the left of its count", () => {
    const urdu = { ...asr, name: "عصر" };
    expect(menuBarTitle({ slot: urdu, kind: "upcoming" }, at(16, 28), w).text).toBe("\u200Eعصر\u200E -5");
    expect(menuBarTitle({ slot: urdu, kind: "ending" }, at(18, 7), w).text).toBe("\u200Eعصر\u200E (-5)");
  });
});

describe("ltrName", () => {
  it("wraps right-to-left names in left-to-right marks", () => {
    expect(ltrName("مغرب")).toBe("\u200Eمغرب\u200E");
    expect(ltrName("جمعہ")).toBe("\u200Eجمعہ\u200E");
  });

  it("leaves left-to-right names unchanged", () => {
    expect(ltrName("Maghrib")).toBe("Maghrib");
    expect(ltrName("Jumu'ah")).toBe("Jumu'ah");
  });
});

describe("reminder key marker", () => {
  it("ends every reminder's notes with its prayer-times key", () => {
    const plan = planReminders(at(9, 0), config, {
      dueAt: "start",
      headsUpMinutes: 0,
      windows,
      days: 1,
    });
    for (const item of plan) expect(item.notes.split("\n").pop()).toBe(`prayer-times://${item.key}`);
  });
});

describe("alert bookkeeping", () => {
  it("lists every alert whose time has come, so older ones aren't fired later", () => {
    const asr = getDaySchedule(at(12, 0), config)[2];
    expect(passedAlertIds(asr, at(16, 20), windows)).toEqual([]);
    expect(passedAlertIds(asr, at(16, 36), windows)).toEqual(["2026-10-08/asr:start", "2026-10-08/asr:jamaat"]);
  });

  it("leaves out jamaat and ending alarms when their minutes are 0", () => {
    const asr = getDaySchedule(at(12, 0), config)[2];
    const off = { ...windows, jamaatReminderMinutes: 0, endingReminderMinutes: 0 };
    const options: PlanOptions = { dueAt: "start", headsUpMinutes: 0, windows: off, days: 1 };
    expect(alarmTimes(asr, asr.start, options).map(hm)).toEqual(["16:33"]);
  });

  it("skips an ending alarm that would fall before the start", () => {
    const asr = getDaySchedule(at(12, 0), config)[2];
    const long = { ...windows, endingReminderMinutes: 600 };
    const options: PlanOptions = { dueAt: "start", headsUpMinutes: 0, windows: long, days: 1 };
    expect(alarmTimes(asr, asr.start, options).map(hm)).toEqual(["16:33", "16:35"]);
  });
});
