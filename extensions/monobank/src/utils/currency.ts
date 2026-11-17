import cc from "currency-codes";
import { Currency } from "../types";
import { parseAmount } from "./rates";

// `currency-codes` keys codes as 3 digits ("036"), but monobank sends numbers, e.g. 36 for AUD.
function findByNumber(numericCode: number) {
  return cc.number(String(numericCode).padStart(3, "0"));
}

export function isKnownCurrency(numericCode: number) {
  return !!findByNumber(numericCode);
}

/** Callers must only pass codes known to `currency-codes` (see `isKnownCurrency`). */
export function toCurrency(numericCode: number): Currency {
  const record = findByNumber(numericCode)!;

  return {
    name: record.currency,
    code: record.code,
    number: record.number,
  };
}

/** Like `toCurrency`, but an unknown code becomes a currency named after its number instead of crashing. */
export function toCurrencyOrUnknown(numericCode: number): Currency {
  if (isKnownCurrency(numericCode)) return toCurrency(numericCode);

  const number = numericCode.toString();
  return { name: `Currency ${number}`, code: number, number };
}

/** Number of minor-unit digits (2 for kopiyky and cents). Falls back to 2 for unknown currencies. */
export function getCurrencyDigits(currency: Currency) {
  return cc.code(currency.code)?.digits ?? 2;
}

/** Converts an API amount in minor units to major units. */
export function fromMinorUnits(amount: number, currency: Currency) {
  return amount / 10 ** getCurrencyDigits(currency);
}

/** An amount as plain text with the currency's decimals, e.g. "-120.50", for copying and CSV. */
export function formatPlainAmount(amount: number, currency: Currency) {
  return amount.toFixed(getCurrencyDigits(currency));
}

export function formatCurrency(number: number, currencyCode: string, fractionDigits = 2) {
  // `Intl` throws on codes that aren't 3 letters, e.g. the number of an unknown currency.
  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    return `${number.toFixed(fractionDigits)} ${currencyCode}`;
  }

  return Intl.NumberFormat("uk-UA", {
    currency: currencyCode,
    style: "currency",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
    .format(number)
    .replace(",", ".");
}

/** Formats an amount with the currency's own decimals. With `signed`, income gets a leading "+". */
export function formatAmount(amount: number, currency: Currency, options: { signed?: boolean } = {}) {
  const formatted = formatCurrency(amount, currency.code, getCurrencyDigits(currency));
  return options.signed && amount > 0 ? `+${formatted}` : formatted;
}

export function getFlagImage(currencyCode: string) {
  return `country-flags/${currencyCode}.png`;
}

// Symbols and words people type instead of ISO codes, in English and Ukrainian. Prefixes catch word forms
// ("доларів", "гривні", "dollars").
const currencyAliases: { code: string; exact: string[]; prefixes: string[] }[] = [
  { code: "USD", exact: ["$"], prefixes: ["дол", "dollar"] },
  { code: "EUR", exact: ["€", "євро", "euro", "euros"], prefixes: [] },
  { code: "UAH", exact: ["₴", "грн"], prefixes: ["гривн", "hryvn"] },
  { code: "PLN", exact: ["zł", "zl"], prefixes: ["злот", "zlot"] },
  { code: "GBP", exact: ["£"], prefixes: ["фунт", "pound"] },
];

/**
 * An ISO 4217 letter code from a code in any case ("usd"), a symbol ("$") or a currency name ("гривні").
 * Other text is uppercased as it is, so the caller can report an unknown currency. Undefined for empty text.
 */
export function parseCurrencyCode(text: string): string | undefined {
  const value = text.trim().toLowerCase();
  if (!value) return undefined;

  const alias = currencyAliases.find(
    (alias) => alias.exact.includes(value) || alias.prefixes.some((prefix) => value.startsWith(prefix)),
  );
  return alias?.code ?? value.toUpperCase();
}

// Words between the currencies, e.g. "100 usd to eur" or "100 доларів в гривні".
const connectorWords = new Set(["to", "in", "into", "в", "у", "на", "=", "->", "→"]);

/**
 * Parses a conversion like "100 usd", "100usd", "$100", "usd 100", "1 000,50 грн", "100 usd eur" or
 * "100 usd to eur". `amount` is undefined when the text has no valid amount; `from` and `to` are ISO codes
 * (see `parseCurrencyCode`) or undefined when not given.
 */
export function parseConvertQuery(text: string): { amount?: number; from?: string; to?: string } {
  const spaced = text.replace(/->|→/g, " ");
  // A currency may come before the amount ("$100", "usd 100"). The amount can have spaces ("1 000").
  const match = /^\s*([^\d\s]*)\s*(\d[\d\s.,]*)(.*)$/.exec(spaced);
  if (!match) return {};

  const [, prefix, amountText, rest] = match;
  const words = rest
    .trim()
    .split(/\s+/)
    .filter((word) => word && !connectorWords.has(word.toLowerCase()));
  const currencies = prefix ? [prefix, ...words] : words;

  return {
    amount: parseAmount(amountText),
    from: currencies[0] !== undefined ? parseCurrencyCode(currencies[0]) : undefined,
    to: currencies[1] !== undefined ? parseCurrencyCode(currencies[1]) : undefined,
  };
}
