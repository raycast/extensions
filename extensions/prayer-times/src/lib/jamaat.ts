/**
 * Jamaat rules, written as short strings in preferences:
 *
 * - `""`          no jamaat
 * - `"13:30"`     fixed local time (24h)
 * - `"+10"`       10 minutes after the prayer starts
 * - `"floor5+15"` round the start down to 5 minutes, then add 15 (5:01 -> 5:15)
 * - `"ceil5+10"`  round the start up to 5 minutes, then add 10
 * - `"end-30"`    30 minutes before the prayer time ends (e.g. before Asr starts, for Dhuhr)
 *
 * The step after floor/ceil is optional and defaults to 5.
 */
export type JamaatRule =
  | { kind: "none" }
  | { kind: "fixed"; hours: number; minutes: number }
  | { kind: "offset"; minutes: number }
  | { kind: "round"; direction: "floor" | "ceil"; step: number; minutes: number }
  | { kind: "beforeEnd"; minutes: number }
  | { kind: "invalid"; text: string };

const MINUTE = 60_000;

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

  const offset = value.match(/^\+(\d{1,3})$/);
  if (offset) return { kind: "offset", minutes: Number(offset[1]) };

  const round = value.match(/^(floor|ceil)(\d{1,2})?\+(\d{1,3})$/);
  if (round) {
    const step = round[2] ? Number(round[2]) : 5;
    if (step < 1) return { kind: "invalid", text: value };
    return { kind: "round", direction: round[1] as "floor" | "ceil", step, minutes: Number(round[3]) };
  }

  return { kind: "invalid", text: value };
}

/**
 * Work out the jamaat time for a prayer that starts at `start`.
 *
 * @param rule - Parsed rule.
 * @param start - Prayer start time.
 * @param end - When the prayer time ends; needed for `end-N` rules.
 * @returns Jamaat time, or undefined when there is no valid jamaat at or after the start.
 */
export function applyJamaatRule(rule: JamaatRule, start: Date, end?: Date): Date | undefined {
  switch (rule.kind) {
    case "none":
    case "invalid":
      return undefined;
    case "fixed": {
      const at = new Date(start.getFullYear(), start.getMonth(), start.getDate(), rule.hours, rule.minutes);
      return at >= start ? at : undefined;
    }
    case "offset":
      return new Date(start.getTime() + rule.minutes * MINUTE);
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
