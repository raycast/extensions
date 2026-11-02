export type DurationUnit = "ms" | "s" | "m" | "h" | "d" | "w" | "mo" | "y";

export interface DurationPart {
  amount: number;
  unit: DurationUnit;
}

export interface RelativeTime {
  parts: DurationPart[];
  /** -1 for the past ("ago"), 1 for the future ("in", "from now"). */
  direction: 1 | -1;
}

const UNIT_ALIASES: Record<DurationUnit, string[]> = {
  ms: ["ms", "msec", "msecs", "millisecond", "milliseconds"],
  s: ["s", "sec", "secs", "second", "seconds"],
  m: ["m", "min", "mins", "minute", "minutes"],
  h: ["h", "hr", "hrs", "hour", "hours"],
  d: ["d", "day", "days"],
  w: ["w", "wk", "wks", "week", "weeks"],
  mo: ["mo", "mos", "month", "months"],
  y: ["y", "yr", "yrs", "year", "years"],
};

const UNIT_LOOKUP = new Map<string, DurationUnit>(
  Object.entries(UNIT_ALIASES).flatMap(([unit, aliases]) => aliases.map((a) => [a, unit as DurationUnit])),
);

const FIXED_UNIT_MS: Record<Exclude<DurationUnit, "mo" | "y">, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

const UNIT_NAMES: Record<DurationUnit, string> = {
  ms: "millisecond",
  s: "second",
  m: "minute",
  h: "hour",
  d: "day",
  w: "week",
  mo: "month",
  y: "year",
};

/** Parses "1 day 2 hours", "1d2h", "an hour", "3 weeks, 2 days" etc. Returns undefined if not a duration. */
export function parseDurationParts(input: string): DurationPart[] | undefined {
  const text = input.trim().toLowerCase();
  if (!text) return undefined;
  const re = /\s*(?:,\s*|and\s+)?(\d+(?:\.\d+)?|an?)\s*([a-z]+)\s*/y;
  const parts: DurationPart[] = [];
  let index = 0;
  while (index < text.length) {
    re.lastIndex = index;
    const match = re.exec(text);
    if (!match) return undefined;
    const unit = UNIT_LOOKUP.get(match[2]);
    if (!unit) return undefined;
    const amount = match[1] === "a" || match[1] === "an" ? 1 : Number(match[1]);
    parts.push({ amount, unit });
    index = re.lastIndex;
  }
  return parts.length > 0 ? parts : undefined;
}

/**
 * Parses relative expressions: "10 seconds ago", "in 2 hours", "3 days from now", "+1h30m", "-2d".
 * A bare duration ("10 minutes") is treated as being in the past.
 */
export function parseRelativeTime(input: string): RelativeTime | undefined {
  let text = input.trim().toLowerCase();
  let direction: 1 | -1 | undefined;

  if (text.startsWith("+")) {
    direction = 1;
    text = text.slice(1);
  } else if (text.startsWith("-")) {
    direction = -1;
    text = text.slice(1);
  } else if (/^in\s+/.test(text)) {
    direction = 1;
    text = text.replace(/^in\s+/, "");
  }

  if (/\s*ago$/.test(text)) {
    if (direction === 1) return undefined;
    direction = -1;
    text = text.replace(/\s*ago$/, "");
  } else if (/\s*(from now|later|hence)$/.test(text)) {
    if (direction === -1) return undefined;
    direction = 1;
    text = text.replace(/\s*(from now|later|hence)$/, "");
  }

  const parts = parseDurationParts(text);
  if (!parts) return undefined;
  return { parts, direction: direction ?? -1 };
}

/** Adds months, clamping the day so Jan 31 + 1 month is the last day of February rather than early March. */
function addCalendarMonths(date: Date, months: number): void {
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
}

export function applyDuration(base: Date, parts: DurationPart[], direction: 1 | -1): Date {
  const result = new Date(base.getTime());
  for (const { amount, unit } of parts) {
    if ((unit === "mo" || unit === "y") && Number.isInteger(amount)) {
      const months = unit === "y" ? amount * 12 : amount;
      addCalendarMonths(result, direction * months);
    } else if (unit === "mo" || unit === "y") {
      const days = unit === "y" ? amount * 365.25 : amount * 30.44;
      result.setTime(result.getTime() + direction * days * FIXED_UNIT_MS.d);
    } else {
      result.setTime(result.getTime() + direction * amount * FIXED_UNIT_MS[unit]);
    }
  }
  return result;
}

export function describeDuration(parts: DurationPart[]): string {
  return parts.map(({ amount, unit }) => `${amount} ${UNIT_NAMES[unit]}${amount === 1 ? "" : "s"}`).join(" ");
}

export function describeRelativeTime({ parts, direction }: RelativeTime): string {
  const text = describeDuration(parts);
  return direction === -1 ? `${text} ago` : `in ${text}`;
}
