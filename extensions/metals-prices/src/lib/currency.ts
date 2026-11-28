/**
 * Display-currency helpers. The user picks the display currency in the
 * extension preferences (`currency`); `DEFAULT_CURRENCY` is the fallback used
 * when no explicit currency is threaded through (and the preference default).
 * The selected value flows from the command into the API client and the UI.
 */

/** Fallback display currency and the default of the `currency` preference. */
export const DEFAULT_CURRENCY = "SAR";

/**
 * Currencies offered by the `currency` preference dropdown. Each must be a code
 * that metals.dev's `/latest?currency=<code>` accepts (it returns the metal
 * prices in that currency plus `currencies.USD`, the USD→currency rate used to
 * convert the USD-canonical history). Mirror any change here into
 * `package.json`'s `currency` preference `data` array — Raycast can't import
 * this list.
 */
export const SUPPORTED_CURRENCIES = [
  { title: "SAR — Saudi Riyal", value: "SAR" },
  { title: "AED — UAE Dirham", value: "AED" },
  { title: "KWD — Kuwaiti Dinar", value: "KWD" },
  { title: "QAR — Qatari Riyal", value: "QAR" },
  { title: "BHD — Bahraini Dinar", value: "BHD" },
  { title: "OMR — Omani Rial", value: "OMR" },
  { title: "USD — US Dollar", value: "USD" },
  { title: "EUR — Euro", value: "EUR" },
  { title: "GBP — British Pound", value: "GBP" },
] as const;

/**
 * Decimals needed to keep a value legible across the whole range we render.
 * Two decimals suit gold in SAR (~480/g) but destroy silver in a high-value
 * currency: 925 silver in KWD is ~0.39/g and its daily move ~0.001, which two
 * decimals would render as "0.00". Scaling the precision to the magnitude keeps
 * every metal/currency pair meaningful.
 */
export function fractionDigitsFor(value: number): number {
  const magnitude = Math.abs(value);
  if (magnitude >= 10) return 2;
  if (magnitude >= 1) return 3;
  if (magnitude >= 0.1) return 4;
  return 5;
}

const formatters = new Map<string, Intl.NumberFormat>();

/**
 * Format a number as a currency amount, e.g. "SAR 1,234.56". Precision follows
 * the value's own magnitude unless `digits` is given — pass the row's price
 * magnitude when formatting a related figure (like the day's change) so both
 * read at the same precision.
 */
export function formatCurrency(value: number, currency: string = DEFAULT_CURRENCY, digits?: number): string {
  const fractionDigits = digits ?? fractionDigitsFor(value);
  const cacheKey = `${currency}:${fractionDigits}`;
  let formatter = formatters.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    formatters.set(cacheKey, formatter);
  }
  return formatter.format(value);
}

/** Plain number at the same precision as `formatCurrency`, e.g. "483.54". */
export function formatAmount(value: number, digits?: number): string {
  return value.toFixed(digits ?? fractionDigitsFor(value));
}
