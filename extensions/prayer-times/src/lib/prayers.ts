import { CalculationMethod, Coordinates, Madhab, PrayerTimes, SunnahTimes } from "adhan";
import { applyJamaatRule, parseJamaatRule } from "./jamaat";

export type PrayerKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

export const PRAYER_KEYS: readonly PrayerKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

export const PRAYER_NAMES: Record<PrayerKey, string> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

export type MethodName = keyof typeof CalculationMethod;

/** Everything needed to turn a calendar day into prayer slots. */
export interface ScheduleConfig {
  latitude: number;
  longitude: number;
  method: MethodName;
  madhab: "hanafi" | "shafi";
  /** Minutes added to each start time, in PRAYER_KEYS order. */
  adjustments: Record<PrayerKey, number>;
  ishaEnd: "midnight" | "fajr";
  /** Display name per prayer (the Reminder Titles setting); empty entries fall back to English. */
  names?: Partial<Record<PrayerKey, string>>;
  /** Display name for Friday's Dhuhr; empty falls back to "Jumu'ah". */
  jumuahName?: string;
  /** Where Dhuhr's time ends: Asr as calculated, or the earlier Shafi'i Asr (shadow = 1×) even with Hanafi Asr. */
  dhuhrEnd: "asr" | "shafiAsr";
  jamaat: Record<PrayerKey, string>;
  /** Friday Dhuhr rule; empty falls back to the Dhuhr rule. */
  jamaatJumuah: string;
}

/** One prayer on one day: when it starts, when its time ends, and its jamaat if configured. */
export interface PrayerSlot {
  /** Stable id, `YYYY-MM-DD/key`; also the reminder key after `prayer-times://`. */
  id: string;
  key: PrayerKey;
  name: string;
  /** Local calendar date the prayer belongs to, `YYYY-MM-DD`. */
  date: string;
  start: Date;
  end: Date;
  jamaat?: Date;
  /** Friday Dhuhr, prayed as Jumu'ah. */
  jumuah?: boolean;
}

/**
 * Format a Date as a local `YYYY-MM-DD` string.
 *
 * @param date - Any instant; the local calendar date is used.
 * @returns The local date key.
 */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Return a new Date at local midnight `offset` days from `day`.
 *
 * @param day - Reference day.
 * @param offset - Whole days to move, may be negative.
 * @returns Local midnight of the resulting day.
 */
export function addDays(day: Date, offset: number): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() + offset);
}

/**
 * The name shown for a prayer everywhere (menu bar, lists, alerts, reminders): the configured title,
 * or the English name when none is set.
 *
 * @param key - Prayer.
 * @param jumuah - Friday's Dhuhr.
 * @param config - Schedule configuration with optional names.
 * @returns Display name.
 */
export function prayerName(
  key: PrayerKey,
  jumuah: boolean,
  config: Pick<ScheduleConfig, "names" | "jumuahName">,
): string {
  if (jumuah) return config.jumuahName?.trim() || "Jumu'ah";
  return config.names?.[key]?.trim() || PRAYER_NAMES[key];
}

function computeTimes(day: Date, config: ScheduleConfig, madhab = config.madhab): PrayerTimes {
  const params = CalculationMethod[config.method]();
  params.madhab = madhab === "hanafi" ? Madhab.Hanafi : Madhab.Shafi;
  params.adjustments = { ...params.adjustments, ...config.adjustments };
  const coordinates = new Coordinates(config.latitude, config.longitude);
  return new PrayerTimes(coordinates, new Date(day.getFullYear(), day.getMonth(), day.getDate()), params);
}

/**
 * Compute the five prayer slots for a local calendar day.
 *
 * Each prayer ends when the next one's time begins: Fajr at sunrise, Dhuhr at Asr,
 * Asr at Maghrib, Maghrib at Isha, and Isha at Islamic midnight or the next Fajr.
 *
 * @param day - Any instant on the wanted local day.
 * @param config - Location, method and jamaat rules.
 * @returns Slots in prayer order.
 */
export function getDaySchedule(day: Date, config: ScheduleConfig): PrayerSlot[] {
  const times = computeTimes(day, config);
  const nextTimes = computeTimes(addDays(day, 1), config);
  const date = toDateKey(day);
  const isFriday = day.getDay() === 5;

  const ishaEnd = config.ishaEnd === "fajr" ? nextTimes.fajr : new SunnahTimes(times).middleOfTheNight;
  const bounds: Record<PrayerKey, [Date, Date]> = {
    fajr: [times.fajr, times.sunrise],
    dhuhr: [times.dhuhr, config.dhuhrEnd === "shafiAsr" ? computeTimes(day, config, "shafi").asr : times.asr],
    asr: [times.asr, times.maghrib],
    maghrib: [times.maghrib, times.isha],
    isha: [times.isha, ishaEnd],
  };

  return PRAYER_KEYS.map((key) => {
    const [start, end] = bounds[key];
    const jumuah = key === "dhuhr" && isFriday;
    const ruleText = jumuah && config.jamaatJumuah.trim() ? config.jamaatJumuah : config.jamaat[key];
    const jamaat = applyJamaatRule(parseJamaatRule(ruleText), start, end);
    return {
      id: `${date}/${key}`,
      key,
      name: prayerName(key, jumuah, config),
      jumuah,
      date,
      start,
      end,
      jamaat: jamaat && jamaat < end ? jamaat : undefined,
    };
  });
}

/**
 * Slots from yesterday through tomorrow, so a late Isha and tomorrow's Fajr are both covered.
 *
 * @param now - The current instant.
 * @param config - Schedule configuration.
 * @returns Slots sorted by start time.
 */
export function getTimeline(now: Date, config: ScheduleConfig): PrayerSlot[] {
  return [-1, 0, 1].flatMap((offset) => getDaySchedule(addDays(now, offset), config));
}

/** A non-prayer time shown for reference in the menu bar dropdown. */
export interface ReferenceTime {
  id: string;
  name: string;
  at: Date;
}

/**
 * Sunrise, Islamic midnight and the last third of the night for a day (the night after its Maghrib).
 *
 * @param day - Any instant on the wanted local day.
 * @param config - Schedule configuration.
 * @returns Reference times in order.
 */
export function getReferenceTimes(day: Date, config: ScheduleConfig): ReferenceTime[] {
  const times = computeTimes(day, config);
  const night = new SunnahTimes(times);
  const date = toDateKey(day);
  return [
    { id: `${date}/sunrise`, name: "Sunrise", at: times.sunrise },
    { id: `${date}/midnight`, name: "Midnight", at: night.middleOfTheNight },
    { id: `${date}/lastThird`, name: "Tahajjud (last third)", at: night.lastThirdOfTheNight },
  ];
}
