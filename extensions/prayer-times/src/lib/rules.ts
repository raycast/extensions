/**
 * When each prayer's time starts and ends, per school of fiqh.
 *
 * Every prayer has a valid end (after it the prayer is late, qaza) and may have an earlier preferred end:
 * the start of a disliked (makruh) period, or the end of the preferred (ikhtiyar / fadilah) time.
 */

export type School = "hanafi" | "shafi" | "maliki" | "hanbali" | "jafari";

/** Concrete timing rules, after resolving "School default". */
export interface PrayerRules {
  /** Asr starts when a shadow is one (`shafi`) or two (`hanafi`) times its object, plus the noon shadow. */
  asrStart: "hanafi" | "shafi";
  /** Dhuhr's valid end: Asr, the earlier one-shadow Asr (Hanafi precaution), or sunset (Ja'fari shared time). */
  dhuhrEnd: "asr" | "shafiAsr" | "sunset";
  /** Dhuhr's preferred end: the one-shadow (Shafi'i) Asr (Hanafi), or Asr's start (Ja'fari, valid until sunset). */
  dhuhrPreferred: "none" | "shafiAsr" | "asr";
  /** Asr's preferred end: the sun turning yellow, or a shadow twice its object. Valid end is always sunset. */
  asrPreferred: "none" | "yellow" | "twoShadows";
  /** Maghrib starts at sunset, or once the eastern redness has gone (Ja'fari). */
  maghribStart: "sunset" | "easternRedness";
  /** Maghrib's valid end: Isha's start, red twilight at 15° or 12°, or Islamic midnight (Ja'fari). */
  maghribEnd: "isha" | "red15" | "red12" | "midnight";
  /** Maghrib's preferred end: stars appear, a short window, or Isha's start (western redness, Ja'fari). */
  maghribPreferred: "none" | "stars" | "short" | "isha";
  /** Isha's valid end: Islamic midnight (Ja'fari) or Fajr. */
  ishaEnd: "midnight" | "fajr";
  /** Isha's preferred end: Islamic midnight or the first third of the night. */
  ishaPreferred: "none" | "midnight" | "firstThird";
}

/** Minutes before sunset when the sun turns yellow; Asr is disliked (makruh) after it (Hanafi, Maliki). */
export const YELLOW_SUN_MINUTES = 20;
/** Minutes after sunset by which the stars are out; delaying Maghrib past it is makruh (Hanafi). */
export const STARS_MINUTES = 35;
/** Minutes after sunset for Maghrib's short preferred window (Maliki, Shafi'i minority view). */
export const SHORT_MAGHRIB_MINUTES = 25;

/**
 * Each school's position. Sources: Sahih Muslim 612 (Asr until the sun pales), the Jibril hadith
 * (Abu Dawud 393, Tirmidhi 149) for one vs two shadows, Hanafi fatwas on red/white twilight, and
 * Ja'fari rulings on the eastern redness and the shared Dhuhr/Asr and Maghrib/Isha times.
 */
export const SCHOOL_RULES: Record<School, PrayerRules> = {
  hanafi: {
    asrStart: "hanafi",
    dhuhrEnd: "asr",
    dhuhrPreferred: "shafiAsr",
    asrPreferred: "yellow",
    maghribStart: "sunset",
    maghribEnd: "isha",
    maghribPreferred: "stars",
    ishaEnd: "fajr",
    ishaPreferred: "midnight",
  },
  shafi: {
    asrStart: "shafi",
    dhuhrEnd: "asr",
    dhuhrPreferred: "none",
    asrPreferred: "twoShadows",
    maghribStart: "sunset",
    maghribEnd: "isha",
    maghribPreferred: "none",
    ishaEnd: "fajr",
    ishaPreferred: "firstThird",
  },
  maliki: {
    asrStart: "shafi",
    dhuhrEnd: "asr",
    dhuhrPreferred: "none",
    asrPreferred: "yellow",
    maghribStart: "sunset",
    maghribEnd: "isha",
    maghribPreferred: "short",
    ishaEnd: "fajr",
    ishaPreferred: "firstThird",
  },
  hanbali: {
    asrStart: "shafi",
    dhuhrEnd: "asr",
    dhuhrPreferred: "none",
    asrPreferred: "twoShadows",
    maghribStart: "sunset",
    maghribEnd: "isha",
    maghribPreferred: "none",
    ishaEnd: "fajr",
    ishaPreferred: "firstThird",
  },
  jafari: {
    asrStart: "shafi",
    dhuhrEnd: "sunset",
    dhuhrPreferred: "asr",
    asrPreferred: "none",
    maghribStart: "easternRedness",
    maghribEnd: "midnight",
    maghribPreferred: "isha",
    ishaEnd: "midnight",
    ishaPreferred: "firstThird",
  },
};

/** A preference that is either a concrete choice or "school", meaning the school's default. */
type Choice<T> = T | "school" | undefined;

/** Preference values that can override a school's rules; "school" or missing keeps the school's rule. */
export interface RuleOverrides {
  asrStart?: Choice<PrayerRules["asrStart"]>;
  asrPreferred?: Choice<PrayerRules["asrPreferred"]>;
  maghribStart?: Choice<PrayerRules["maghribStart"]>;
  maghribEnd?: Choice<PrayerRules["maghribEnd"]>;
  maghribPreferred?: Choice<PrayerRules["maghribPreferred"]>;
  ishaEnd?: Choice<PrayerRules["ishaEnd"]>;
  ishaPreferred?: Choice<PrayerRules["ishaPreferred"]>;
  /** Hanafi precaution, off by default: end Dhuhr at the one-shadow Asr instead of preferring it until then. */
  dhuhrEndsAtOneShadow?: boolean;
}

function pick<T extends string>(value: Choice<T>, allowed: readonly T[], fallback: T): T {
  return value && value !== "school" && allowed.includes(value) ? value : fallback;
}

/**
 * The rules for a school with the user's overrides applied. Unknown values fall back to the school.
 *
 * @param school - School of fiqh.
 * @param overrides - Preference values; "school" or missing keeps the school's rule.
 * @returns Concrete rules.
 */
export function resolveRules(school: School, overrides: RuleOverrides = {}): PrayerRules {
  const base = SCHOOL_RULES[school] ?? SCHOOL_RULES.hanafi;
  const asrStart = pick(overrides.asrStart, ["hanafi", "shafi"], base.asrStart);
  // Dhuhr's end follows Asr's start, except Ja'fari's shared time, which runs to sunset.
  const dhuhrEnd =
    base.dhuhrEnd === "sunset"
      ? "sunset"
      : asrStart === "hanafi" && overrides.dhuhrEndsAtOneShadow === true
        ? "shafiAsr"
        : "asr";
  return {
    asrStart,
    dhuhrEnd,
    dhuhrPreferred: base.dhuhrPreferred,
    asrPreferred: pick(overrides.asrPreferred, ["none", "yellow", "twoShadows"], base.asrPreferred),
    maghribStart: pick(overrides.maghribStart, ["sunset", "easternRedness"], base.maghribStart),
    maghribEnd: pick(overrides.maghribEnd, ["isha", "red15", "red12", "midnight"], base.maghribEnd),
    maghribPreferred: pick(overrides.maghribPreferred, ["none", "stars", "short", "isha"], base.maghribPreferred),
    ishaEnd: pick(overrides.ishaEnd, ["midnight", "fajr"], base.ishaEnd),
    ishaPreferred: pick(overrides.ishaPreferred, ["none", "midnight", "firstThird"], base.ishaPreferred),
  };
}

/**
 * The school from a preference value, Hanafi when missing or unknown.
 *
 * @param value - Preference value.
 * @returns School.
 */
export function toSchool(value: string | undefined): School {
  return value && value in SCHOOL_RULES ? (value as School) : "hanafi";
}
