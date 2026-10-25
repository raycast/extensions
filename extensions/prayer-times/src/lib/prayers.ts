import { CalculationMethod, CalculationParameters, Coordinates, Madhab, PrayerTimes } from "adhan";
import { applyJamaatRule, parseJamaatRule } from "./jamaat";
import { PrayerRules, SHORT_MAGHRIB_MINUTES, STARS_MINUTES, YELLOW_SUN_MINUTES } from "./rules";

export type PrayerKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

export const PRAYER_KEYS: readonly PrayerKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

export const PRAYER_NAMES: Record<PrayerKey, string> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

/** The Arabic Prayer Names choice (Arabic letters, e.g. ظهر with Arabic heh, not Urdu ہ). */
export const ARABIC_NAMES: Pick<ScheduleConfig, "names" | "jumuahName"> = {
  names: { fajr: "فجر", dhuhr: "ظهر", asr: "عصر", maghrib: "مغرب", isha: "عشاء" },
  jumuahName: "جمعة",
};

/** adhan's methods plus Ja'fari (Leva Institute, Qom), which adhan doesn't ship. */
export type MethodName = keyof typeof CalculationMethod | "Jafari";

const MINUTE = 60_000;
/** The sun's depression when the eastern redness has gone (Ja'fari Maghrib), for methods without their own. */
const EASTERN_REDNESS_ANGLE = 4;

/** Everything needed to turn a calendar day into prayer slots. */
/** The prayer a combined jamaat rule may follow: Asr after Dhuhr, Isha after Maghrib. */
const COMBINES: Partial<Record<PrayerKey, "dhuhr" | "maghrib">> = { asr: "dhuhr", isha: "maghrib" };

export interface ScheduleConfig {
  latitude: number;
  longitude: number;
  method: MethodName;
  madhab: "hanafi" | "shafi";
  /** Minutes added to each start time, in PRAYER_KEYS order. */
  adjustments: Record<PrayerKey, number>;
  ishaEnd: "midnight" | "fajr";
  /** Maghrib's start; missing uses the method's Maghrib (sunset, or its own angle for Tehran/Ja'fari). */
  maghribStart?: PrayerRules["maghribStart"];
  /** Maghrib's valid end; missing is Isha's start. */
  maghribEnd?: PrayerRules["maghribEnd"];
  /** Preferred ends (start of the disliked time); missing means none. */
  dhuhrPreferred?: PrayerRules["dhuhrPreferred"];
  asrPreferred?: PrayerRules["asrPreferred"];
  maghribPreferred?: PrayerRules["maghribPreferred"];
  ishaPreferred?: PrayerRules["ishaPreferred"];
  /** Whether a prayer counts as late after its valid end or its preferred end; missing is `valid`. */
  lateAt?: "valid" | "preferred";
  /** Display name per prayer (the Prayer Names setting); empty entries fall back to English. */
  names?: Partial<Record<PrayerKey, string>>;
  /** Display name for Friday's Dhuhr; empty falls back to "Jumu'ah". */
  jumuahName?: string;
  /**
   * Where Dhuhr's time ends: Asr as calculated, the earlier Shafi'i Asr (shadow = 1×) even with Hanafi Asr,
   * or sunset (Ja'fari, whose Dhuhr and Asr share their time).
   */
  dhuhrEnd: "asr" | "shafiAsr" | "sunset";
  jamaat: Record<PrayerKey, string>;
  /** Friday Dhuhr rule; empty falls back to the Dhuhr rule. */
  jamaatJumuah: string;
}

/**
 * One prayer on one day: when it starts, when its time ends, and its jamaat if configured.
 *
 * `end` is the valid end; after it the prayer is late (qaza). `preferredEnd` is the start of the disliked
 * (makruh) time or the end of the preferred time; `getDaySchedule` always sets it, to `end` when the school
 * has none for that prayer (optional only for hand-built slots). `late` is whichever of
 * the two the Counts as Late After setting picks: on-time, ending alerts and the red countdown use it.
 */
export interface PrayerSlot {
  /** Stable id, `YYYY-MM-DD/key`; also the reminder key after `prayer-times://`. */
  id: string;
  key: PrayerKey;
  name: string;
  /** Local calendar date the prayer belongs to, `YYYY-MM-DD`. */
  date: string;
  start: Date;
  end: Date;
  preferredEnd?: Date;
  late: Date;
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

function methodParams(method: MethodName): CalculationParameters {
  if (method !== "Jafari") return CalculationMethod[method]();
  // Leva Institute, Qom: Fajr 16°, Maghrib once the sun is 4° down (eastern redness gone), Isha 14°.
  return new CalculationParameters("Other", 16, 14, 0, 4);
}

interface TimeOverrides {
  madhab?: ScheduleConfig["madhab"];
  /** Sun depression for Maghrib (eastern redness), replacing sunset. */
  maghribAngle?: number;
  /** Sun depression for Isha, e.g. 12° or 15° for the end of the red twilight. */
  ishaAngle?: number;
}

function computeTimes(day: Date, config: ScheduleConfig, overrides: TimeOverrides = {}): PrayerTimes {
  const params = methodParams(config.method);
  const madhab = overrides.madhab ?? config.madhab;
  params.madhab = madhab === "hanafi" ? Madhab.Hanafi : Madhab.Shafi;
  if (overrides.maghribAngle !== undefined) params.maghribAngle = overrides.maghribAngle;
  if (overrides.ishaAngle !== undefined) params.ishaAngle = overrides.ishaAngle;
  params.adjustments = { ...params.adjustments, ...config.adjustments };
  const coordinates = new Coordinates(config.latitude, config.longitude);
  return new PrayerTimes(coordinates, new Date(day.getFullYear(), day.getMonth(), day.getDate()), params);
}

function roundedMinute(date: Date): Date {
  return new Date(Math.round(date.getTime() / MINUTE) * MINUTE);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MINUTE);
}

/** Sunset as a prayer time: rounded to the minute, with the Maghrib minute adjustment applied. */
function sunsetPrayerTime(times: PrayerTimes, config: ScheduleConfig): Date {
  return addMinutes(roundedMinute(times.sunset), config.adjustments.maghrib ?? 0);
}

/**
 * A point in the night, measured from sunset to the next Fajr: ½ is Islamic midnight, ⅓ the end of the
 * first third. From sunset rather than Maghrib, so Ja'fari's later Maghrib doesn't move midnight.
 */
function nightPoint(times: PrayerTimes, nextTimes: PrayerTimes, fraction: number): Date {
  const sunset = times.sunset.getTime();
  return roundedMinute(new Date(sunset + (nextTimes.fajr.getTime() - sunset) * fraction));
}

/**
 * Compute the five prayer slots for a local calendar day.
 *
 * By default each prayer ends when the next one's time begins: Fajr at sunrise, Dhuhr at Asr, Asr at
 * sunset, Maghrib at Isha, and Isha at Islamic midnight or the next Fajr. The config's rules (rules.ts)
 * change those ends and add each prayer's preferred end.
 *
 * @param day - Any instant on the wanted local day.
 * @param config - Location, method, rules and jamaat rules.
 * @returns Slots in prayer order.
 */
export function getDaySchedule(day: Date, config: ScheduleConfig): PrayerSlot[] {
  const times = computeTimes(day, config);
  const nextTimes = computeTimes(addDays(day, 1), config);
  const date = toDateKey(day);
  const isFriday = day.getDay() === 5;
  const methodHasMaghribAngle = Boolean(methodParams(config.method).maghribAngle);

  const sunset = methodHasMaghribAngle ? sunsetPrayerTime(times, config) : times.maghrib;
  const midnight = nightPoint(times, nextTimes, 1 / 2);
  const firstThird = nightPoint(times, nextTimes, 1 / 3);
  const asrAt = (madhab: ScheduleConfig["madhab"]) =>
    madhab === config.madhab ? times.asr : computeTimes(day, config, { madhab }).asr;
  const twilightEnd = (angle: number) => computeTimes(day, config, { ishaAngle: angle }).isha;

  const maghribStart =
    config.maghribStart === "sunset"
      ? sunset
      : config.maghribStart === "easternRedness" && !methodHasMaghribAngle
        ? computeTimes(day, config, { maghribAngle: EASTERN_REDNESS_ANGLE }).maghrib
        : times.maghrib;

  const bounds: Record<PrayerKey, [start: Date, end: Date, preferredEnd: Date | undefined]> = {
    fajr: [times.fajr, times.sunrise, undefined],
    dhuhr: [
      times.dhuhr,
      config.dhuhrEnd === "sunset" ? sunset : config.dhuhrEnd === "shafiAsr" ? asrAt("shafi") : times.asr,
      config.dhuhrPreferred === "asr" ? times.asr : config.dhuhrPreferred === "shafiAsr" ? asrAt("shafi") : undefined,
    ],
    asr: [
      times.asr,
      sunset,
      config.asrPreferred === "yellow"
        ? addMinutes(sunset, -YELLOW_SUN_MINUTES)
        : config.asrPreferred === "twoShadows"
          ? asrAt("hanafi")
          : undefined,
    ],
    maghrib: [
      maghribStart,
      config.maghribEnd === "red15"
        ? twilightEnd(15)
        : config.maghribEnd === "red12"
          ? twilightEnd(12)
          : config.maghribEnd === "midnight"
            ? midnight
            : times.isha,
      config.maghribPreferred === "stars"
        ? addMinutes(sunset, STARS_MINUTES)
        : config.maghribPreferred === "short"
          ? addMinutes(sunset, SHORT_MAGHRIB_MINUTES)
          : config.maghribPreferred === "isha"
            ? times.isha
            : undefined,
    ],
    isha: [
      times.isha,
      config.ishaEnd === "fajr" ? nextTimes.fajr : midnight,
      config.ishaPreferred === "midnight" ? midnight : config.ishaPreferred === "firstThird" ? firstThird : undefined,
    ],
  };

  const slots: PrayerSlot[] = [];
  for (const key of PRAYER_KEYS) {
    const [calculatedStart, end, preferred] = bounds[key];
    let start = calculatedStart;
    const jumuah = key === "dhuhr" && isFriday;
    const ruleText = jumuah && config.jamaatJumuah.trim() ? config.jamaatJumuah : config.jamaat[key];
    const rule = parseJamaatRule(ruleText);
    // `dhuhr+N` / `maghrib+N` follow that prayer's jamaat, on Asr / Isha only.
    const combinedWith =
      rule.kind === "after" && COMBINES[key] === rule.prayer
        ? slots.find((slot) => slot.key === rule.prayer)
        : undefined;
    let jamaat = applyJamaatRule(rule, start, end, combinedWith && (combinedWith.jamaat ?? combinedWith.start));
    if (jamaat && jamaat < start) {
      // Prayed together before its own start: valid only where the earlier prayer's time runs into this one
      // (Ja'fari: Dhuhr until sunset, Maghrib until midnight). The prayer's time then starts at the jamaat.
      const shared = key === "asr" ? config.dhuhrEnd === "sunset" : config.maghribEnd === "midnight";
      if (shared) start = jamaat;
      else jamaat = undefined;
    }
    // Every prayer has a preferred end; without one inside its time (e.g. two shadows is Hanafi Asr's start, or
    // Hanafi Fajr) it is the end itself.
    const preferredEnd = preferred && preferred > start && preferred < end ? preferred : end;
    slots.push({
      id: `${date}/${key}`,
      key,
      name: prayerName(key, jumuah, config),
      jumuah,
      date,
      start,
      end,
      preferredEnd,
      late: config.lateAt === "preferred" ? preferredEnd : end,
      jamaat: jamaat && jamaat < end ? jamaat : undefined,
    });
  }
  return slots;
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
  const nextTimes = computeTimes(addDays(day, 1), config);
  const date = toDateKey(day);
  return [
    { id: `${date}/sunrise`, name: "Sunrise", at: times.sunrise },
    { id: `${date}/midnight`, name: "Midnight", at: nightPoint(times, nextTimes, 1 / 2) },
    { id: `${date}/lastThird`, name: "Tahajjud (last third)", at: nightPoint(times, nextTimes, 2 / 3) },
  ];
}
