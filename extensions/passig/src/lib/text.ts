/**
 * Text helpers: all strings live in `strings.ts` (US English) and are formatted
 * with `en-US` number/date conventions.
 */
import { format, type Params } from "./format";
import { strings } from "./strings";

export type MessageKey = keyof typeof strings;
export type { Params } from "./format";

const LOCALE = "en-US";

/** Returns the string for `key`, with `{placeholders}` and plurals filled in. */
export function t(key: MessageKey, params?: Params): string {
  const template: string = strings[key] ?? key;
  return format(template, params ?? {}, LOCALE);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat(LOCALE).format(n);
}

export function formatDateTime(date: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(LOCALE, options ?? { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

export function formatDate(date: Date | string | number): string {
  return new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "long", year: "numeric" }).format(new Date(date));
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency: currency.toUpperCase() }).format(amount);
}
