/**
 * Formatting is deliberately kept independent of the interface language: the interface is English,
 * but a German user still wants 7.980,00 €. The locale comes from a preference rather than from the
 * process environment — macOS separates language from region, and Node only ever sees the language,
 * so LANG reports en-US even on a machine set to German number formats.
 */

/** Keeps an amount and its currency sign on one line — Raycast's renderer breaks on plain spaces. */
function unbreakable(value: string): string {
  return value.replace(/\s/g, " ");
}

export function formatMoney(value: number, currency: string, locale: string): string {
  return unbreakable(new Intl.NumberFormat(locale, { style: "currency", currency }).format(value));
}

export function formatShortDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "2-digit" }).format(date);
}

export function formatLongDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export function formatQuantity(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
}

/** The locale actually in effect for this process, used when the user picks "system". */
export function systemLocale(): string {
  return new Intl.DateTimeFormat().resolvedOptions().locale;
}
