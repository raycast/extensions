// Unix timestamp <-> human-readable conversion.
//
// A numeric input is interpreted as a Unix timestamp; a non-numeric input is
// parsed as a date string (the reverse direction). Timestamps are kept exactly
// as BigInt nanoseconds so even microsecond/nanosecond values convert without
// the precision loss `Number` would suffer past 2^53; the JS `Date` (which works
// in milliseconds) is derived from that for the human-readable formats.

export type Unit = "seconds" | "milliseconds" | "microseconds" | "nanoseconds";

/** Units in the order they are presented to the user. */
export const UNITS: Unit[] = ["seconds", "milliseconds", "microseconds", "nanoseconds"];

export const UNIT_LABEL: Record<Unit, string> = {
  seconds: "Seconds",
  milliseconds: "Milliseconds",
  microseconds: "Microseconds",
  nanoseconds: "Nanoseconds",
};

/** Conventional short suffix for each unit. */
export const UNIT_ABBR: Record<Unit, string> = {
  seconds: "s",
  milliseconds: "ms",
  microseconds: "µs",
  nanoseconds: "ns",
};

/** Nanoseconds in one of each unit — the scale factor used to normalize input. */
const NANOS_PER: Record<Unit, bigint> = {
  seconds: 1_000_000_000n,
  milliseconds: 1_000_000n,
  microseconds: 1_000n,
  nanoseconds: 1n,
};

const NUMERIC = /^[+-]?\d+(\.\d+)?$/;

/**
 * Guess the unit of a bare timestamp from how many (significant) integer digits
 * it has. Modern timestamps land on clean digit counts — seconds ≈ 10, ms ≈ 13,
 * µs ≈ 16, ns ≈ 19 — so the thresholds bias toward the interpretation that puts
 * the value in a plausible date range. Genuinely ambiguous values (e.g. an
 * early-1970s millisecond value vs. a far-future second value) default to the
 * smaller unit; the caller can force a unit to override this.
 */
export function detectUnit(significantDigits: number): Unit {
  if (significantDigits <= 11) return "seconds";
  if (significantDigits <= 14) return "milliseconds";
  if (significantDigits <= 17) return "microseconds";
  return "nanoseconds";
}

export type Parsed = {
  /** The interpreted instant as a JS Date (millisecond precision). */
  date: Date;
  /** The same instant in exact nanoseconds since the epoch. */
  epochNanos: bigint;
  /** Whether the input was read as a timestamp or parsed as a date string. */
  kind: "timestamp" | "date";
  /** For `timestamp` input: the unit it was read in. */
  unit: Unit;
  /** For `timestamp` input: whether `unit` was auto-detected (vs. forced). */
  detected: boolean;
};

/**
 * Parse `raw` as either a Unix timestamp (numeric) or a date string. `override`
 * forces the unit of a numeric timestamp; `"auto"` detects it. Throws with a
 * specific message on empty, unrecognized, or out-of-range input.
 */
export function parseInput(raw: string, override: Unit | "auto"): Parsed {
  const input = raw.trim();
  if (!input) throw new Error("Enter a Unix timestamp or a date.");

  // Allow `_` and spaces as digit separators (e.g. 1_700_000_000).
  const cleaned = input.replace(/[_\s]/g, "");
  if (NUMERIC.test(cleaned)) return parseTimestamp(cleaned, override);

  const ms = Date.parse(input);
  if (Number.isNaN(ms)) throw new Error("Not a Unix timestamp or a recognizable date.");
  return {
    date: new Date(ms),
    epochNanos: BigInt(ms) * NANOS_PER.milliseconds,
    kind: "date",
    unit: "seconds",
    detected: false,
  };
}

function parseTimestamp(cleaned: string, override: Unit | "auto"): Parsed {
  const intPart = cleaned.replace(/^[+-]/, "").split(".")[0];
  const significantDigits = intPart.replace(/^0+(?=\d)/, "").length;
  const unit = override === "auto" ? detectUnit(significantDigits) : override;

  let epochNanos: bigint;
  if (cleaned.includes(".")) {
    // A fractional timestamp can't be scaled with BigInt, so round through Number.
    epochNanos = BigInt(Math.round(Number(cleaned) * Number(NANOS_PER[unit])));
  } else {
    epochNanos = BigInt(cleaned) * NANOS_PER[unit];
  }

  const date = new Date(Number(epochNanos) / Number(NANOS_PER.milliseconds));
  if (Number.isNaN(date.getTime())) throw new Error("Timestamp is out of the representable date range.");
  return { date, epochNanos, kind: "timestamp", unit, detected: override === "auto" };
}

/** Render an instant (given as exact nanoseconds) in every unit, as integers. */
export function toUnits(epochNanos: bigint): Record<Unit, string> {
  return {
    seconds: (epochNanos / NANOS_PER.seconds).toString(),
    milliseconds: (epochNanos / NANOS_PER.milliseconds).toString(),
    microseconds: (epochNanos / NANOS_PER.microseconds).toString(),
    nanoseconds: epochNanos.toString(),
  };
}

export type Format = { label: string; value: string };

/** The human-readable formats shown for a parsed instant. `hour12` toggles 12/24-hour time. */
export function formats(date: Date, now: Date, hour12 = false): Format[] {
  return [
    { label: "Local", value: full(date, undefined, hour12) },
    { label: "UTC", value: full(date, "UTC", hour12) },
    { label: "ISO 8601", value: date.toISOString() },
    { label: "RFC 2822", value: date.toUTCString() },
    { label: "Relative", value: relative(date, now) },
  ];
}

function full(date: Date, timeZone?: string, hour12 = false): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12,
    timeZone,
    timeZoneName: "short",
  }).format(date);
}

/** A signed, human relative time such as "in 3 hours" or "2 years ago". */
export function relative(target: Date, now: Date): string {
  const sec = Math.round((target.getTime() - now.getTime()) / 1000);
  if (Math.abs(sec) < 1) return "just now";
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "always" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
    ["second", 1],
  ];
  for (const [unit, span] of units) {
    if (Math.abs(sec) >= span || unit === "second") return rtf.format(Math.round(sec / span), unit);
  }
  return "just now";
}
