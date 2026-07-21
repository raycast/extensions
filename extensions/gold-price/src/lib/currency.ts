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
 * that metals.dev's `/latest?currency=<code>` accepts (it returns `metals.gold`
 * in that currency plus `currencies.USD`, the USD→currency rate used to convert
 * the USD-canonical history). Mirror any change here into `package.json`'s
 * `currency` preference `data` array — Raycast can't import this list.
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

const formatters = new Map<string, Intl.NumberFormat>();

/** Format a number as a 2-decimal currency amount, e.g. "SAR 1,234.56". */
export function formatCurrency(value: number, currency: string = DEFAULT_CURRENCY): string {
  let formatter = formatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    formatters.set(currency, formatter);
  }
  return formatter.format(value);
}
