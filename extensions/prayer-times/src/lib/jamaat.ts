import type { PrayerKey } from "./prayers";
import { ExprError, NameValues, RuleExpression } from "./rule-expr";

/**
 * Jamaat rules, written as short strings in preferences:
 *
 * - `""`          no jamaat
 * - `"13:30"`     fixed local time (24h)
 * - `"+10"`       10 minutes after the prayer starts
 * - `"floor5+15"` round the start down to 5 minutes, then add 15 (5:01 -> 5:15)
 * - `"ceil5+10"`  round the start up to 5 minutes, then add 10
 * - `"end-30"`    30 minutes before the prayer time ends (e.g. before Asr starts, for Dhuhr)
 * - `"dhuhr+10"`  10 minutes after Dhuhr's jamaat (Asr only), `"maghrib+5"` after Maghrib's (Isha only):
 *                 combined prayers, as most Shia mosques pray them
 *
 * - anything else is a formula (rule-expr.ts), as on the phone: `ceil(start, 15) + 15` rounds the start up
 *   to 15 minutes and adds 15
 *
 * The step after floor/ceil is optional and defaults to 5.
 */
export type JamaatRule =
  | { kind: "none" }
  | { kind: "fixed"; hours: number; minutes: number }
  | { kind: "offset"; minutes: number }
  | { kind: "round"; direction: "floor" | "ceil"; step: number; minutes: number }
  | { kind: "beforeEnd"; minutes: number }
  | { kind: "after"; prayer: "dhuhr" | "maghrib"; minutes: number }
  | { kind: "formula"; source: string }
  | { kind: "invalid"; text: string };

const MINUTE = 60_000;

/** Prayer order (prayers.ts's PRAYER_KEYS, repeated so the two modules don't import each other's values). */
const PRAYER_KEYS: readonly PrayerKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

/** The longest formula kept, as on the phone. */
export const FORMULA_MAX_LENGTH = 300;

/**
 * The names a formula can use, in minutes after the day's midnight unless noted: `start`, `end`,
 * `preferred_end` (the end where the school has none), `sunrise`, `sunset`, `midnight`, `latest_start_week`
 * (this prayer's latest start in the week from Saturday), `weekday` (Monday 1 to Sunday 7), `is_friday`
 * (1 or 0), `day`, `month`, each prayer's `_start` and `_end`, and an earlier prayer's `_jamaat`.
 */
export const FORMULA_NAMES = [
  "start",
  "end",
  "preferred_end",
  "sunrise",
  "sunset",
  "midnight",
  "latest_start_week",
  "weekday",
  "is_friday",
  "day",
  "month",
  ...PRAYER_KEYS.flatMap((key) => [`${key}_start`, `${key}_end`]),
  ...PRAYER_KEYS.slice(0, -1).map((key) => `${key}_jamaat`),
];

/**
 * Parse a jamaat rule string.
 *
 * @param text - Rule text from preferences.
 * @returns The parsed rule, or `invalid` with the original text.
 */
export function parseJamaatRule(text: string | undefined): JamaatRule {
  const value = (text ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (!value) return { kind: "none" };

  const fixed = value.match(/^(\d{1,2}):(\d{2})$/);
  if (fixed) {
    const hours = Number(fixed[1]);
    const minutes = Number(fixed[2]);
    if (hours < 24 && minutes < 60) return { kind: "fixed", hours, minutes };
    return { kind: "invalid", text: value };
  }

  const beforeEnd = value.match(/^end-(\d{1,3})$/);
  if (beforeEnd) return { kind: "beforeEnd", minutes: Number(beforeEnd[1]) };

  const after = value.match(/^(dhuhr|maghrib)\+(\d{1,3})$/);
  if (after) return { kind: "after", prayer: after[1] as "dhuhr" | "maghrib", minutes: Number(after[2]) };

  const offset = value.match(/^\+(\d{1,3})$/);
  if (offset) return { kind: "offset", minutes: Number(offset[1]) };

  const round = value.match(/^(floor|ceil)(\d{1,2})?\+(\d{1,3})$/);
  if (round) {
    const step = round[2] ? Number(round[2]) : 5;
    if (step < 1) return { kind: "invalid", text: value };
    return { kind: "round", direction: round[1] as "floor" | "ceil", step, minutes: Number(round[3]) };
  }

  return { kind: "formula", source: (text ?? "").trim().slice(0, FORMULA_MAX_LENGTH) };
}

/**
 * What stops a formula from working for a prayer, found without a day: it doesn't parse, it uses a name
 * that doesn't exist, or a jamaat that isn't earlier. Day-dependent problems (an earlier prayer with no
 * jamaat, a result outside the day) show on the slot as `jamaatError`.
 *
 * @param source - Formula text.
 * @param key - The prayer it is for.
 * @returns The problem, or undefined.
 */
export function formulaProblem(source: string, key: PrayerKey): string | undefined {
  let names: Set<string>;
  try {
    names = RuleExpression.cached(source).names;
  } catch (err) {
    if (err instanceof ExprError) return err.toString();
    throw err;
  }
  if (names.size === 0) {
    // No names: the same time every day, so it can be checked now.
    try {
      formulaMinutes(source, {});
    } catch (err) {
      if (err instanceof ExprError) return err.toString();
      throw err;
    }
  }
  for (const name of names) {
    if (!FORMULA_NAMES.includes(name)) return `Unknown name '${name}'`;
    const jamaatOf = PRAYER_KEYS.find((p) => name === `${p}_jamaat`);
    if (jamaatOf && PRAYER_KEYS.indexOf(jamaatOf) >= PRAYER_KEYS.indexOf(key)) {
      return `'${name}' is only available to prayers after ${jamaatOf}`;
    }
  }
  return undefined;
}

/**
 * A formula's jamaat, in minutes after the day's midnight.
 *
 * @param source - Formula text.
 * @param names - Each name's value, looked up only when used.
 * @returns Whole minutes, 0 to 2880.
 * @throws ExprError when the formula fails or lands outside the day.
 */
export function formulaMinutes(source: string, names: NameValues): number {
  const value = RuleExpression.cached(source).evaluate(names);
  // Halves away from zero, as Dart's round() on the phone.
  const v = Math.sign(value) * Math.round(Math.abs(value));
  if (v < 0 || v > 2 * 1440) throw new ExprError(`The result (${v} minutes) is outside the day`);
  return v;
}

/**
 * Work out the jamaat time for a prayer that starts at `start`.
 *
 * @param rule - Parsed rule.
 * @param start - Prayer start time.
 * @param end - When the prayer time ends; needed for `end-N` rules.
 * @param earlier - Jamaat (or start) of the prayer an `after` rule follows.
 * @returns Jamaat time, or undefined when there is no valid jamaat at or after the start. An `after` rule
 *   can land before the start; the caller decides whether the prayers share their time.
 */
export function applyJamaatRule(rule: JamaatRule, start: Date, end?: Date, earlier?: Date): Date | undefined {
  switch (rule.kind) {
    case "none":
    case "invalid":
    case "formula": // worked out in getDaySchedule, which has the names
      return undefined;
    case "fixed": {
      const at = new Date(start.getFullYear(), start.getMonth(), start.getDate(), rule.hours, rule.minutes);
      return at >= start ? at : undefined;
    }
    case "offset":
      return new Date(start.getTime() + rule.minutes * MINUTE);
    case "after":
      return earlier && new Date(earlier.getTime() + rule.minutes * MINUTE);
    case "beforeEnd": {
      if (!end) return undefined;
      const at = new Date(end.getTime() - rule.minutes * MINUTE);
      at.setSeconds(0, 0);
      return at >= start ? at : undefined;
    }
    case "round": {
      const base = new Date(start);
      base.setSeconds(0, 0);
      const stepMs = rule.step * MINUTE;
      const sinceMidnight = base.getTime() - new Date(base.getFullYear(), base.getMonth(), base.getDate()).getTime();
      const rounded =
        rule.direction === "floor"
          ? Math.floor(sinceMidnight / stepMs) * stepMs
          : Math.ceil(sinceMidnight / stepMs) * stepMs;
      const at = new Date(base.getTime() - sinceMidnight + rounded + rule.minutes * MINUTE);
      // Rounding down with a small offset can land before the start (floor5+0 at 5:01 → 5:00).
      return at >= base ? at : undefined;
    }
  }
}
