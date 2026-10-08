/**
 * Money is always stored as an integer in the currency's ISO 4217 minor unit (cents for USD, whole yen for JPY,
 * fils for KWD). Adapters convert from the provider's own representation with `fromProviderMinor`.
 */
export type Money = { amountMinor: number; currency: string };

export function normalizeCurrency(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * ISO 4217 minor-unit exponents that differ from 2. Intl is not used for this because it reports CLDR display digits
 * (HUF and TWD as 0, for example), which are not the ISO minor units providers count in.
 */
const ISO_ZERO_DECIMAL = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "ISK",
  "JPY",
  "KMF",
  "KRW",
  "PYG",
  "RWF",
  "UGX",
  "UYI",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);
const ISO_THREE_DECIMAL = new Set(["BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"]);
const ISO_FOUR_DECIMAL = new Set(["CLF", "UYW"]);

/** ISO 4217 minor-unit exponent. Unknown codes fall back to 2. */
export function isoExponent(currency: string): number {
  const code = normalizeCurrency(currency);
  if (ISO_ZERO_DECIMAL.has(code)) return 0;
  if (ISO_THREE_DECIMAL.has(code)) return 3;
  if (ISO_FOUR_DECIMAL.has(code)) return 4;
  return 2;
}

/**
 * Stripe's API representation (https://docs.stripe.com/currencies):
 * - zero-decimal currencies are sent as whole units;
 * - three-decimal currencies are sent with three decimals;
 * - every other currency, including ISK, UGX, HUF and TWD, is sent with two decimals.
 */
const STRIPE_ZERO_DECIMAL = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);
const STRIPE_THREE_DECIMAL = new Set(["BHD", "JOD", "KWD", "OMR", "TND"]);

export function stripeExponent(currency: string): number {
  const code = normalizeCurrency(currency);
  if (STRIPE_ZERO_DECIMAL.has(code)) return 0;
  if (STRIPE_THREE_DECIMAL.has(code)) return 3;
  return 2;
}

/**
 * Converts an integer amount expressed with `providerExponent` decimals into ISO minor units.
 * Example: Stripe sends 500 for 5 ISK (two decimals), ISO says ISK has 0 decimals, so the result is 5.
 */
export function fromProviderMinor(amount: number, currency: string, providerExponent: number): Money {
  const code = normalizeCurrency(currency);
  const diff = isoExponent(code) - providerExponent;
  const amountMinor = diff === 0 ? amount : Math.round(amount * 10 ** diff);
  return { amountMinor, currency: code };
}

/** Parses Paddle's string amounts ("1099") into numbers, rejecting anything that is not an integer. */
export function parseIntegerString(value: string): number {
  if (!/^-?\d+$/.test(value.trim())) {
    throw new Error(`Expected an integer amount, got "${value}"`);
  }
  return Number(value);
}

export function toMajor(money: Money): number {
  return money.amountMinor / 10 ** isoExponent(money.currency);
}

export function fromMajor(amount: number, currency: string): Money {
  const code = normalizeCurrency(currency);
  return { amountMinor: Math.round(amount * 10 ** isoExponent(code)), currency: code };
}

/** Sums amounts per currency. The result is sorted by currency code so output is stable. */
export function sumByCurrency(amounts: Iterable<Money>): Money[] {
  const totals = new Map<string, number>();
  for (const money of amounts) {
    totals.set(money.currency, (totals.get(money.currency) ?? 0) + money.amountMinor);
  }
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, amountMinor]) => ({ currency, amountMinor }));
}

export function addMoney(lists: Money[][]): Money[] {
  return sumByCurrency(lists.flat());
}

export type FormatStyle = "transaction" | "kpi";

/**
 * Formats with Intl and a fixed en-US locale, as the reference extensions do.
 * - "transaction": minimum 0 and maximum the currency's decimals (datafast, trustmrr: min 0, max 2).
 * - "kpi": whole units, for headline figures such as totals and MRR (chartmogul, saasflow).
 */
export function formatMoney(money: Money, style: FormatStyle = "transaction"): string {
  const major = toMajor(money);
  const maximumFractionDigits = style === "kpi" ? 0 : isoExponent(money.currency);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: money.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits,
    }).format(major);
  } catch {
    return `${money.currency} ${major.toFixed(maximumFractionDigits)}`;
  }
}

/** Formats a list of per-currency amounts, e.g. "$1,200 + €300". Empty lists render as the placeholder. */
export function formatMoneyList(amounts: Money[], style: FormatStyle = "transaction", empty = "—"): string {
  const nonZero = amounts.filter((m) => m.amountMinor !== 0);
  if (nonZero.length === 0) {
    return amounts.length > 0 ? formatMoney(amounts[0] as Money, style) : empty;
  }
  return nonZero.map((m) => formatMoney(m, style)).join(" + ");
}

export function negate(money: Money): Money {
  return { amountMinor: -money.amountMinor, currency: money.currency };
}
