import { locale, type Language, type Translate } from "./i18n";
import type { DocumentSummary, TimeEntry } from "./types";

/** Euro amount from cents, in the language's format: "1.234,56 €" or "€1,234.56". */
export function formatMoney(cents: number, language: Language, currency = "EUR"): string {
  return new Intl.NumberFormat(locale(language), { style: "currency", currency }).format(cents / 100);
}

/** Cents from a decimal string of the helper ("1234.56"). Never through floating point sums. */
export function centsFromDecimal(value: string): number {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return Number.NaN;
  const [, sign, euros, fraction = ""] = match;
  const cents = Number(euros) * 100 + Number(fraction.padEnd(2, "0"));
  return sign === "-" ? -cents : cents;
}

/**
 * Normalizes what a person types as an amount ("1.234,50", "1234.5", "95") to the helper's
 * money format ("1234.50"). Returns undefined when it is not an amount with at most two decimals.
 */
export function parseAmountInput(input: string): string | undefined {
  let text = input.trim().replace(/[€\s]/g, "");
  if (!text) return undefined;
  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    // Both separators: the last one is the decimal separator, the other groups thousands.
    const decimal = lastComma > lastDot ? "," : ".";
    const group = decimal === "," ? "." : ",";
    text = text.split(group).join("").replace(decimal, ".");
  } else if (lastComma >= 0) {
    text = text.replace(",", ".");
  }
  if (!/^-?\d+(\.\d{1,2})?$/.test(text)) return undefined;
  const [euros, fraction = ""] = text.split(".");
  return `${euros}.${fraction.padEnd(2, "0")}`;
}

/** Like `parseAmountInput`, but for quantities and unit prices (up to four decimals, no sign). */
export function parseDecimalInput(input: string, maxDecimals = 4): string | undefined {
  const text = input.trim().replace(/\s/g, "").replace(",", ".");
  const pattern = new RegExp(`^\\d+(\\.\\d{1,${maxDecimals}})?$`);
  return pattern.test(text) ? text : undefined;
}

/** ISO date ("2026-10-05") for a person: "05.10.2026" / "Oct 5, 2026". */
export function formatDate(isoDate: string, language: Language): string {
  const date = parseIsoDate(isoDate);
  if (!date) return isoDate;
  return new Intl.DateTimeFormat(locale(language), { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

export function parseIsoDate(isoDate: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return undefined;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

/** A local calendar day as the helper expects it (yyyy-MM-dd). */
export function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function formatTime(timestamp: string, language: Language): string {
  return new Intl.DateTimeFormat(locale(language), { hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp));
}

/** Duration as "1:05" (hours and minutes), the format of Folnaro's menu bar timer. */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds / 60));
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

/** Duration for a sentence: "1:05 h" / "12 min". */
export function formatDuration(seconds: number, language: Language): string {
  const minutes = Math.max(0, Math.round(seconds / 60));
  if (minutes < 60) return language === "de" ? `${minutes} Min.` : `${minutes} min`;
  return `${formatClock(minutes * 60)} h`;
}

/**
 * Elapsed seconds of a running entry. `started_at` is authoritative; `duration_seconds` is the
 * helper's value at the time of the call and only a fallback.
 */
export function elapsedSeconds(entry: TimeEntry, now: Date = new Date()): number {
  if (entry.started_at) {
    const started = Date.parse(entry.started_at);
    if (!Number.isNaN(started)) return Math.max(0, Math.floor((now.getTime() - started) / 1000));
  }
  return entry.duration_seconds;
}

/** Status a person sees for a document: "Overdue" wins over open/sent/partially paid. */
export function documentStatusKey(document: DocumentSummary): `status.${string}` {
  if (document.is_overdue) return "status.overdue";
  return `status.${document.status}`;
}

/** Status tone, named after the brand aliases (docs/brand/tokens.json, `status…`). */
export type StatusTone =
  "draft" | "open" | "sent" | "partiallyPaid" | "paid" | "overdue" | "cancelled" | "accepted" | "declined";

export function documentStatusTone(document: DocumentSummary): StatusTone {
  if (document.is_overdue) return "overdue";
  switch (document.status) {
    case "draft":
    case "ready_to_finalize":
      return "draft";
    case "open":
      return "open";
    case "sent":
      return "sent";
    case "partiallyPaid":
      return "partiallyPaid";
    case "paid":
      return "paid";
    case "writtenOff":
    case "cancelled":
      return "cancelled";
    case "accepted":
      return "accepted";
    case "declined":
      return "declined";
  }
}

/** The label shown for a document's number: drafts have none yet. */
export function documentNumberLabel(document: DocumentSummary, t: Translate): string {
  return document.number ?? t("search.draft");
}
