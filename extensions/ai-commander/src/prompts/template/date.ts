/**
 * `{date}`, `{time}`, `{datetime}` and `{day}` without a date library.
 *
 * Syntax per https://manual.raycast.com/dynamic-placeholders (read 2026-11-02). Raycast's format table is not part of
 * the manual's text, so `format` implements the common Unicode TR35 letters listed in `FIELD_LETTERS`. Unsupported
 * letters are rejected rather than printed, because `YYYY` or `DD` would otherwise produce silently wrong dates.
 *
 * Deliberate difference: Raycast forbids `format` together with `locale`. Here `locale` then localizes month and day
 * names, a strict superset that cannot break a template copied from Raycast.
 */

import type { DateKind } from "./parser";

export const DEFAULT_LOCALE = "en-US";

export type OffsetUnit = "m" | "M" | "h" | "d" | "y";

export interface DateOffset {
  amount: number;
  unit: OffsetUnit;
}

export interface DateOptions {
  offset?: string;
  format?: string;
  locale?: string;
}

type FormatPart = { literal: string } | { letter: string; width: number };

/** Letters supported in `format`, with the widest run each accepts. */
const FIELD_LETTERS: Readonly<Record<string, number>> = {
  y: 4,
  M: 5,
  d: 2,
  E: 5,
  a: 1,
  H: 2,
  h: 2,
  m: 2,
  s: 2,
  S: 3,
};

/** `+3d`, `-2M` or several separated by blanks. Units are case-sensitive, no space after the sign. */
export function parseDateOffset(value: string): DateOffset[] | undefined {
  const tokens = value.split(/[ \t]+/).filter((token) => token.length > 0);
  if (tokens.length === 0 || tokens.length > 16) return undefined;

  const offsets: DateOffset[] = [];
  for (const token of tokens) {
    const match = /^([+-])(\d{1,6})([mMhdy])$/.exec(token);
    if (!match) return undefined;
    const [, sign, digits, unit] = match;
    offsets.push({ amount: Number(digits) * (sign === "-" ? -1 : 1), unit: unit as OffsetUnit });
  }
  return offsets;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  // Clamp so that Jan 31 + 1 month is the end of February, not March 3.
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

export function applyDateOffsets(date: Date, offsets: readonly DateOffset[]): Date {
  let result = new Date(date);
  for (const { amount, unit } of offsets) {
    switch (unit) {
      case "m":
        result.setMinutes(result.getMinutes() + amount);
        break;
      case "h":
        result.setHours(result.getHours() + amount);
        break;
      case "d":
        result.setDate(result.getDate() + amount);
        break;
      case "M":
        result = addMonths(result, amount);
        break;
      case "y":
        result = addMonths(result, amount * 12);
        break;
    }
  }
  return result;
}

/** Splits a format string, or returns undefined for unsupported letters and unterminated quotes. */
export function parseDateFormat(format: string): FormatPart[] | undefined {
  const parts: FormatPart[] = [];
  let literal = "";
  let index = 0;

  while (index < format.length) {
    const char = format.charAt(index);
    if (char === "'") {
      if (format.charAt(index + 1) === "'") {
        literal += "'";
        index += 2;
        continue;
      }
      index += 1;
      let closed = false;
      while (index < format.length) {
        const inner = format.charAt(index);
        if (inner !== "'") {
          literal += inner;
          index += 1;
        } else if (format.charAt(index + 1) === "'") {
          literal += "'";
          index += 2;
        } else {
          index += 1;
          closed = true;
          break;
        }
      }
      if (!closed) return undefined;
      continue;
    }

    if (!/[A-Za-z]/.test(char)) {
      literal += char;
      index += 1;
      continue;
    }

    let width = 1;
    while (format.charAt(index + width) === char) width += 1;
    const maxWidth = FIELD_LETTERS[char];
    if (maxWidth === undefined || width > maxWidth) return undefined;
    if (literal) parts.push({ literal });
    literal = "";
    parts.push({ letter: char, width });
    index += width;
  }

  if (literal) parts.push({ literal });
  return parts;
}

/** Hyphens only, as in Raycast. Structurally valid but unknown tags such as `xx-XX` are rejected as well. */
export function isValidLocale(locale: string): boolean {
  try {
    return Intl.getCanonicalLocales(locale).length === 1 && Intl.DateTimeFormat.supportedLocalesOf(locale).length === 1;
  } catch {
    return false;
  }
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

function textField(date: Date, locale: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale, options).format(date);
}

function formatField(date: Date, letter: string, width: number, locale: string): string {
  const textStyle = width === 4 ? "long" : width === 5 ? "narrow" : "short";

  switch (letter) {
    case "y":
      return width === 2 ? pad(date.getFullYear() % 100, 2) : pad(date.getFullYear(), width);
    case "M":
      return width <= 2 ? pad(date.getMonth() + 1, width) : textField(date, locale, { month: textStyle });
    case "d":
      return pad(date.getDate(), width);
    case "E":
      return textField(date, locale, { weekday: textStyle });
    case "a": {
      const parts = new Intl.DateTimeFormat(locale, { hour: "numeric", hour12: true }).formatToParts(date);
      return parts.find((part) => part.type === "dayPeriod")?.value ?? "";
    }
    case "H":
      return pad(date.getHours(), width);
    case "h":
      return pad(date.getHours() % 12 || 12, width);
    case "m":
      return pad(date.getMinutes(), width);
    case "s":
      return pad(date.getSeconds(), width);
    default:
      // Only `S` is left: fractions of a second, read from the left like a decimal.
      return pad(date.getMilliseconds(), 3).slice(0, width);
  }
}

function formatDefault(kind: DateKind, date: Date, locale: string): string {
  switch (kind) {
    case "date":
      return textField(date, locale, { dateStyle: "long" });
    case "time":
      return textField(date, locale, { timeStyle: "short" });
    case "datetime":
      return textField(date, locale, { dateStyle: "long", timeStyle: "short" });
    case "day":
      return textField(date, locale, { weekday: "long" });
  }
}

/** Throws `RangeError` on invalid options. Validation normally stops those before a run. */
export function formatDatePlaceholder(kind: DateKind, now: Date, options: DateOptions = {}): string {
  const locale = options.locale ?? DEFAULT_LOCALE;
  if (!isValidLocale(locale)) throw new RangeError("Invalid locale");

  let date = now;
  if (options.offset !== undefined) {
    const offsets = parseDateOffset(options.offset);
    if (!offsets) throw new RangeError("Invalid date offset");
    date = applyDateOffsets(now, offsets);
  }
  if (Number.isNaN(date.getTime())) throw new RangeError("Date out of range");

  if (options.format === undefined) return formatDefault(kind, date, locale);

  const parts = parseDateFormat(options.format);
  if (!parts) throw new RangeError("Invalid date format");
  return parts
    .map((part) => ("literal" in part ? part.literal : formatField(date, part.letter, part.width, locale)))
    .join("");
}
