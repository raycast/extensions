/**
 * Exchange rates from Frankfurter (ECB and other central-bank reference rates).
 * Docs: https://frankfurter.dev/ (v2: GET https://api.frankfurter.dev/v2/rates?base=USD)
 * The old api.frankfurter.app host now 301-redirects to api.frankfurter.dev/v1, which is deprecated in favour of v2.
 */
import { z } from "zod";
import { ProviderError } from "./errors";
import { buildQuery, Http } from "./http";
import { Money, fromMajor, normalizeCurrency, sumByCurrency, toMajor } from "./money";

export const FX_BASE_URL = "https://api.frankfurter.dev/v2";
export const FX_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type FxRates = {
  base: string;
  /** Most recent rate date in the response (YYYY-MM-DD). */
  date: string;
  /** 1 unit of `base` = rates[quote] units of `quote`. */
  rates: Record<string, number>;
  fetchedAt: number;
};

export interface FxStore {
  get(base: string): FxRates | undefined;
  set(rates: FxRates): void;
}

export function memoryFxStore(): FxStore {
  const map = new Map<string, FxRates>();
  return {
    get: (base) => map.get(normalizeCurrency(base)),
    set: (rates) => map.set(rates.base, rates),
  };
}

const RatesResponse = z.array(
  z.object({
    date: z.string(),
    base: z.string(),
    quote: z.string(),
    rate: z.number().positive(),
  }),
);

export async function fetchRates(base: string, deps: { http: Http; now: () => number }): Promise<FxRates> {
  const code = normalizeCurrency(base);
  const rows = await deps.http({
    source: "fx",
    url: `${FX_BASE_URL}/rates${buildQuery({ base: code })}`,
    headers: { Accept: "application/json" },
    schema: RatesResponse,
    errorMessage: (body) =>
      typeof body === "object" && body !== null && "message" in body ? String(body.message) : undefined,
  });
  if (rows.length === 0) {
    throw new ProviderError("fx", "schema", `No exchange rates returned for ${code}`);
  }
  const rates: Record<string, number> = {};
  let date = "";
  for (const row of rows) {
    rates[normalizeCurrency(row.quote)] = row.rate;
    if (row.date > date) date = row.date;
  }
  return { base: code, date, rates, fetchedAt: deps.now() };
}

export type RatesResult = { rates: FxRates; stale: boolean };

/**
 * Returns rates for `base`, served from the store when younger than 24h. When a refresh fails, the last known rates
 * are returned and flagged as stale. Throws only when there has never been a successful fetch.
 */
export async function getRates(
  base: string,
  deps: { http: Http; store: FxStore; now: () => number; maxAgeMs?: number },
): Promise<RatesResult> {
  const code = normalizeCurrency(base);
  const cached = deps.store.get(code);
  const maxAge = deps.maxAgeMs ?? FX_MAX_AGE_MS;
  if (cached && deps.now() - cached.fetchedAt < maxAge) {
    return { rates: cached, stale: false };
  }
  try {
    const fresh = await fetchRates(code, deps);
    deps.store.set(fresh);
    return { rates: fresh, stale: false };
  } catch (error) {
    if (cached) return { rates: cached, stale: true };
    throw error;
  }
}

/** Converts into `rates.base`. Returns undefined when the source currency has no rate. */
export function convert(money: Money, rates: FxRates): Money | undefined {
  const from = normalizeCurrency(money.currency);
  if (from === rates.base) return { amountMinor: money.amountMinor, currency: from };
  const rate = rates.rates[from];
  if (!rate) return undefined;
  return fromMajor(toMajor(money) / rate, rates.base);
}

export type ConvertedTotal = {
  /** Sum of everything that could be converted, in `rates.base`. */
  total: Money;
  /** Amounts in currencies the rate source does not cover, left as-is. */
  unconverted: Money[];
};

export function convertTotal(amounts: Money[], rates: FxRates): ConvertedTotal {
  let totalMinor = 0;
  const unconverted: Money[] = [];
  for (const money of sumByCurrency(amounts)) {
    const converted = convert(money, rates);
    if (converted) {
      totalMinor += converted.amountMinor;
    } else {
      unconverted.push(money);
    }
  }
  return { total: { amountMinor: totalMinor, currency: rates.base }, unconverted };
}

/** Conversion when every amount is already in the display currency, so no network call is needed. */
export function needsRates(amounts: Money[], displayCurrency: string): boolean {
  const code = normalizeCurrency(displayCurrency);
  return amounts.some((m) => m.amountMinor !== 0 && normalizeCurrency(m.currency) !== code);
}
