import { Color, List } from "@raycast/api";
import { USD_UAH_RATE_ID } from "../data/constants";
import { Currency, CurrencyRate, RatesSnapshot } from "../types";

export function getRateTitle(rate: CurrencyRate) {
  return `${rate.currencyA.code} – ${rate.currencyB.code}`;
}

export function getRateSubtitle(rate: CurrencyRate) {
  return rate.rateCross ? `${rate.rateCross}` : `${rate.rateBuy ?? "–"} / ${rate.rateSell ?? "–"}`;
}

/** What "Currency Rate Menu Bar" shows next to the flag (its "Menu Bar Title" preference). */
export type RateMenuBarTitle = "sell" | "buy" | "buySell" | "none";

/** The rate in the menu bar title: the chosen one, else the first pinned one, else USD – UAH, else the first rate. */
export function getMenuBarRate(rates: CurrencyRate[], selectedId: string, pinnedIds: string[]) {
  const find = (id: string) => rates.find((rate) => rate.id === id);
  return (
    (selectedId ? find(selectedId) : undefined) ??
    pinnedIds.map(find).find(Boolean) ??
    find(USD_UAH_RATE_ID) ??
    rates[0]
  );
}

/**
 * The menu bar title for `rate`, or undefined to show only the flag. Pairs with only a cross rate show it.
 * With `change`, it's appended, e.g. "41.32 ↑0.12".
 */
export function getRateMenuBarTitle(rate: CurrencyRate, mode: RateMenuBarTitle, change?: RateChange) {
  if (mode === "none") return undefined;

  const suffix = change ? ` ${formatRateChange(change.delta, { compact: true })}` : "";
  if (rate.rateCross !== undefined) return `${rate.rateCross}${suffix}`;
  if (mode === "buy") return `${rate.rateBuy ?? "–"}${suffix}`;
  if (mode === "buySell") return `${getRateSubtitle(rate)}${suffix}`;
  return `${rate.rateSell ?? "–"}${suffix}`;
}

/** With `previous`, the change since that day comes first, green when the rate went up and red when it went down. */
export function getRateAccessories(rate: CurrencyRate, previous?: RatesSnapshot): List.Item.Accessory[] {
  const change = getRateChange(rate, previous);
  const name: List.Item.Accessory = { text: `${rate.currencyA.name} – ${rate.currencyB.name}` };
  if (!change || !previous) return [name];

  const text = { value: formatRateChange(change.delta), color: change.delta > 0 ? Color.Green : Color.Red };
  return [{ text, tooltip: formatRateChangeTooltip(change, previous.day) }, name];
}

export type RateField = "sell" | "buy" | "cross";

const rateFieldKeys = { sell: "rateSell", buy: "rateBuy", cross: "rateCross" } as const;
const rateFieldLabels: Record<RateField, string> = { sell: "Sell", buy: "Buy", cross: "Cross" };

export interface RateChange {
  field: RateField;
  /** `to - from`, rounded to the 4 decimals rates have. */
  delta: number;
  from: number;
  to: number;
}

/**
 * Which rate the change is shown for: the cross rate for pairs that only have one, the buy rate when the menu bar
 * title shows it, else the sell rate.
 */
export function getChangeField(rate: CurrencyRate, mode?: RateMenuBarTitle): RateField {
  if (rate.rateCross !== undefined) return "cross";
  return mode === "buy" ? "buy" : "sell";
}

/** How much `field` of `rate` changed since `previous`, or undefined when it didn't or there's nothing to compare. */
export function getRateChange(
  rate: CurrencyRate,
  previous: RatesSnapshot | undefined,
  field = getChangeField(rate),
): RateChange | undefined {
  const from = previous?.rates[rate.id]?.[field];
  const to = rate[rateFieldKeys[field]];
  if (from === undefined || to === undefined) return undefined;

  // Rates have at most 4 decimals, so smaller differences are floating-point noise.
  const delta = Math.round((to - from) * 10_000) / 10_000;
  return Math.abs(delta) < 0.00005 ? undefined : { field, delta, from, to };
}

/** "↑ 0.12" or "↓ 0.0450": 2 decimals, or 4 when the change needs them. `compact` drops the space. */
export function formatRateChange(delta: number, options: { compact?: boolean } = {}) {
  const abs = Math.abs(delta);
  const digits = Math.abs(Math.round(abs * 100) / 100 - abs) < 0.00005 ? 2 : 4;
  return `${delta > 0 ? "↑" : "↓"}${options.compact ? "" : " "}${abs.toFixed(digits)}`;
}

/** "since yesterday", or e.g. "since 7 Nov" when `day` ("YYYY-MM-DD") is earlier. `now` is unix milliseconds. */
export function formatChangeSince(day: string, now = Date.now()) {
  const [year, month, date] = day.split("-").map(Number);
  const then = new Date(year, month - 1, date);
  const yesterday = new Date(now);
  yesterday.setHours(0, 0, 0, 0);
  yesterday.setDate(yesterday.getDate() - 1);

  if (then.getTime() === yesterday.getTime()) return "since yesterday";
  return `since ${then.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
}

/** E.g. "Sell 41.2 → 41.32 since yesterday". */
export function formatRateChangeTooltip(change: RateChange, day: string) {
  return `${rateFieldLabels[change.field]} ${change.from} → ${change.to} ${formatChangeSince(day)}`;
}

/** Parses a positive amount like "200", "200.50", "200,50" or "1 000". */
export function parseAmount(text: string): number | undefined {
  // `\s` also matches non-breaking spaces.
  const normalized = text.replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) return undefined;

  const amount = Number(normalized);
  return amount > 0 ? amount : undefined;
}

export interface RateConversion {
  from: Currency;
  to: Currency;
  /** Units of currency B for 1 unit of currency A. */
  rate: number;
  rateType: "Sell" | "Buy" | "Cross";
  convert: (amount: number) => number;
}

/**
 * Both directions of a pair, from the bank's side: buying currency A from the bank uses its sell rate,
 * selling A to the bank uses its buy rate. Pairs with only a cross rate use it both ways.
 */
export function getRateConversions(rate: CurrencyRate): RateConversion[] {
  const { currencyA, currencyB, rateBuy, rateSell, rateCross } = rate;
  const conversions: RateConversion[] = [];

  const sell = rateSell
    ? { rate: rateSell, rateType: "Sell" as const }
    : rateCross && { rate: rateCross, rateType: "Cross" as const };
  if (sell) {
    conversions.push({ from: currencyB, to: currencyA, ...sell, convert: (amount) => amount / sell.rate });
  }

  const buy = rateBuy
    ? { rate: rateBuy, rateType: "Buy" as const }
    : rateCross && { rate: rateCross, rateType: "Cross" as const };
  if (buy) {
    conversions.push({ from: currencyA, to: currencyB, ...buy, convert: (amount) => amount * buy.rate });
  }

  return conversions;
}

/** The conversion from `from` to `to` on a pair that has both currencies, in either order. */
export function findConversion(rates: CurrencyRate[], from: string, to: string) {
  for (const rate of rates) {
    const codes = [rate.currencyA.code, rate.currencyB.code];
    if (!codes.includes(from) || !codes.includes(to)) continue;

    const conversion = getRateConversions(rate).find(
      (conversion) => conversion.from.code === from && conversion.to.code === to,
    );
    if (conversion) return { rate, conversion };
  }

  return undefined;
}

export interface ConversionStep {
  rate: CurrencyRate;
  conversion: RateConversion;
  /** In `conversion.from`. */
  amount: number;
  /** In `conversion.to`. */
  result: number;
}

/**
 * Converts `amount` from one currency (ISO 4217 letter code) to another the way monobank would exchange it:
 * directly when a pair has both currencies, else through UAH in two steps. Undefined when there's no rate.
 * Results aren't rounded.
 */
export function convertAmount(
  rates: CurrencyRate[],
  amount: number,
  from: string,
  to: string,
): { result: number; steps: ConversionStep[] } | undefined {
  if (from === to) return { result: amount, steps: [] };

  const direct = findConversion(rates, from, to);
  const found = direct ? [direct] : [findConversion(rates, from, "UAH"), findConversion(rates, "UAH", to)];
  if (found.some((step) => step === undefined)) return undefined;

  let value = amount;
  const steps = found.map((step) => {
    const { rate, conversion } = step!;
    const stepAmount = value;
    value = conversion.convert(value);
    return { rate, conversion, amount: stepAmount, result: value };
  });

  return { result: value, steps };
}

/**
 * What it costs in `payWith` to get `amount` of `currency` from monobank, e.g. how many UAH buy 100 USD.
 * Every step is linear, so this is `amount` divided by what 1 unit of `payWith` buys.
 */
export function costOf(rates: CurrencyRate[], amount: number, currency: string, payWith: string) {
  const unit = convertAmount(rates, 1, payWith, currency);
  if (!unit || !(unit.result > 0)) return undefined;

  return { result: amount / unit.result, steps: unit.steps };
}
