import { beforeEach, describe, expect, it, vi } from "vitest";

// Each school's start, valid end and preferred end for one day, checked against times computed
// directly with adhan (sun angles and shadow lengths), not with this extension's rules code.
const prefs = vi.hoisted(() => ({ values: {} as Record<string, unknown> }));
vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => prefs.values,
  LocalStorage: { getItem: async () => undefined },
  environment: {},
}));

import { buildSettings } from "./settings";
import { getDaySchedule, PrayerKey, PrayerSlot } from "./prayers";
import { resolveRules, SCHOOL_RULES } from "./rules";
import { alertsForSlot, currentSlot, menuBarState } from "./state";
import { menuBarTitle } from "./menubar-title";
import { alarmTimes } from "./plan";
import { completionTimeFor } from "./tracker";

// Tests run with TZ=Asia/Karachi. Karachi, Thursday 8 October 2026 (Karachi method unless stated):
// one shadow 15:41, two shadows 16:33, sunset 18:12, eastern redness (4°) 18:26, red twilight 12° 19:01,
// 15° 19:15, Isha 18° 19:28, first third 21:52, midnight 23:42, next Fajr 05:11.
const at = (h: number, m: number, day = 8) => new Date(2026, 9, day, h, m);
const hm = (date: Date | undefined) =>
  date ? `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}` : undefined;

function day(values: Record<string, unknown>): Record<PrayerKey, PrayerSlot> {
  prefs.values = values;
  const settings = buildSettings({ mode: "city", latitude: 24.8607, longitude: 67.0011, label: "Karachi" });
  const slots = getDaySchedule(at(12, 0), settings.schedule);
  return Object.fromEntries(slots.map((slot) => [slot.key, slot])) as Record<PrayerKey, PrayerSlot>;
}
const times = (slot: PrayerSlot) => [hm(slot.start), hm(slot.preferredEnd), hm(slot.end)];

beforeEach(() => {
  prefs.values = {};
});

describe("resolveRules", () => {
  it("uses the school's rules when nothing overrides them", () => {
    expect(resolveRules("maliki")).toEqual(SCHOOL_RULES.maliki);
    expect(resolveRules("maliki", { asrPreferred: "school", maghribEnd: undefined })).toEqual(SCHOOL_RULES.maliki);
  });

  it("applies overrides and ignores unknown values", () => {
    const rules = resolveRules("hanafi", { maghribEnd: "red12", asrPreferred: "bogus" as never });
    expect(rules.maghribEnd).toBe("red12");
    expect(rules.asrPreferred).toBe("yellow");
  });

  it("ends Dhuhr at one shadow only with two-shadow Asr, and at sunset for Ja'fari", () => {
    expect(resolveRules("hanafi").dhuhrEnd).toBe("shafiAsr");
    expect(resolveRules("hanafi", { dhuhrEndsAtOneShadow: false }).dhuhrEnd).toBe("asr");
    expect(resolveRules("hanafi", { asrStart: "shafi" }).dhuhrEnd).toBe("asr");
    expect(resolveRules("jafari").dhuhrEnd).toBe("sunset");
  });
});

describe("Hanafi (the default)", () => {
  const d = () => day({});

  it("starts Asr at two shadows, disliked once the sun turns yellow, valid until sunset", () => {
    expect(times(d().asr)).toEqual(["16:33", "17:52", "18:12"]);
  });

  it("ends Dhuhr at one shadow (precaution), with no preferred end", () => {
    expect(times(d().dhuhr).slice(1)).toEqual([undefined, "15:41"]);
  });

  it("disliked to delay Maghrib past the stars appearing; valid until Isha (white twilight)", () => {
    expect(times(d().maghrib)).toEqual(["18:12", "18:47", "19:28"]);
  });

  it("Isha valid until Fajr, disliked after midnight", () => {
    expect(times(d().isha)).toEqual(["19:28", "23:42", "05:11"]);
  });

  it("counts lateness from the valid end unless set to the preferred end", () => {
    expect(hm(d().asr.late)).toBe("18:12");
    const preferred = day({ lateAt: "preferred" });
    expect([preferred.asr, preferred.maghrib, preferred.isha].map((slot) => hm(slot.late))).toEqual([
      "17:52",
      "18:47",
      "23:42",
    ]);
    expect(hm(preferred.fajr.late)).toBe(hm(preferred.fajr.end)); // no preferred end: falls back to the valid end
  });
});

describe("Shafi'i, Maliki, Hanbali", () => {
  it("Shafi'i: Asr at one shadow, preferred until two shadows; Isha preferred until the first third", () => {
    const d = day({ school: "shafi" });
    expect(times(d.asr)).toEqual(["15:41", "16:33", "18:12"]);
    expect(hm(d.dhuhr.end)).toBe("15:41");
    expect(hm(d.maghrib.preferredEnd)).toBeUndefined();
    expect(times(d.isha)).toEqual(["19:28", "21:52", "05:11"]);
  });

  it("Maliki: Asr preferred until the sun yellows, Maghrib's short window", () => {
    const d = day({ school: "maliki" });
    expect(times(d.asr)).toEqual(["15:41", "17:52", "18:12"]);
    expect(hm(d.maghrib.preferredEnd)).toBe("18:37");
  });

  it("Hanbali: Asr preferred until two shadows", () => {
    expect(times(day({ school: "hanbali" }).asr)).toEqual(["15:41", "16:33", "18:12"]);
  });
});

describe("Ja'fari", () => {
  it("shares Dhuhr's time until sunset, preferred until Asr starts", () => {
    expect(times(day({ school: "jafari" }).dhuhr).slice(1)).toEqual(["15:41", "18:12"]);
  });

  it("starts Maghrib once the eastern redness has gone, valid until midnight, preferred until Isha", () => {
    expect(times(day({ school: "jafari" }).maghrib)).toEqual(["18:26", "19:28", "23:42"]);
  });

  it("ends Isha at midnight, preferred until the first third", () => {
    expect(times(day({ school: "jafari" }).isha)).toEqual(["19:28", "21:52", "23:42"]);
  });

  it("with the Ja'fari method: Fajr 16°, Maghrib 4°, Isha 14°, midnight from sunset to its Fajr", () => {
    const d = day({ school: "jafari", method: "Jafari" });
    expect([hm(d.fajr.start), hm(d.maghrib.start), hm(d.isha.start), hm(d.isha.end)]).toEqual([
      "05:20",
      "18:26",
      "19:10",
      "23:46",
    ]);
  });

  it("picks the prayer that started last when times overlap", () => {
    const d = day({ school: "jafari" });
    const slots = Object.values(d);
    expect(currentSlot(slots, at(16, 0))?.key).toBe("asr"); // Dhuhr is still valid, but Asr has started
    expect(currentSlot(slots, at(13, 0))?.key).toBe("dhuhr");
  });
});

describe("overrides", () => {
  it("ends Maghrib at the red twilight, 15° or a cautious 12°", () => {
    expect(hm(day({ maghribEnd: "red15" }).maghrib.end)).toBe("19:15");
    expect(hm(day({ maghribEnd: "red12" }).maghrib.end)).toBe("19:01");
  });

  it("drops a preferred end that isn't inside the prayer's time", () => {
    // Two shadows is Hanafi Asr's start, so it can't also be its preferred end.
    expect(day({ asrPreferred: "twoShadows" }).asr.preferredEnd).toBeUndefined();
    expect(day({ asrPreferred: "none" }).asr.preferredEnd).toBeUndefined();
  });

  it("starts Maghrib at the eastern redness for any school", () => {
    expect(hm(day({ maghribStart: "easternRedness" }).maghrib.start)).toBe("18:26");
  });
});

describe("the late boundary drives alerts, the menu bar and history", () => {
  const windows = { startWindowMinutes: 5, endingReminderMinutes: 10, jamaatReminderMinutes: 10, headsUpMinutes: 0 };

  it("valid: the ending alert is before sunset; the disliked time shows orange before it", () => {
    const asr = day({}).asr;
    const ending = alertsForSlot(asr, { ...windows, dueAt: "start" }).find((alert) => alert.kind === "ending");
    expect(hm(ending?.at)).toBe("18:02");
    const state = menuBarState([asr], at(17, 55), new Set(), { ...windows, dueAt: "start" }, false);
    expect(state?.kind).toBe("disliked");
    expect(menuBarTitle(state!, at(17, 55), { ...windows, dueAt: "start" })).toMatchObject({
      text: "Asr (-17)",
      tone: "orange",
    });
  });

  it("preferred: the ending alert and red countdown lead up to the yellowing, then orange until sunset", () => {
    const asr = day({ lateAt: "preferred" }).asr;
    const w = { ...windows, dueAt: "start" as const };
    expect(hm(alertsForSlot(asr, w).find((alert) => alert.kind === "ending")?.at)).toBe("17:42");
    const ending = menuBarState([asr], at(17, 45), new Set(), w, false);
    expect(menuBarTitle(ending!, at(17, 45), w)).toMatchObject({ text: "Asr (-7)", tone: "red" });
    expect(menuBarState([asr], at(17, 55), new Set(), w, false)?.kind).toBe("disliked");
  });

  it("puts the reminder's ending alarm before the late boundary", () => {
    const asr = day({ lateAt: "preferred" }).asr;
    const alarms = alarmTimes(asr, asr.start, {
      dueAt: "start",
      headsUpMinutes: 0,
      windows: { ...windows, dueAt: "start" },
      days: 1,
    });
    expect(alarms.map(hm)).toContain("17:42");
  });

  it("records a late override at the late boundary", () => {
    const asr = day({ lateAt: "preferred" }).asr;
    expect(hm(completionTimeFor(asr, false, at(17, 0)))).toBe("17:52");
  });
});
