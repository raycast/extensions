import { Currency } from "./common";

export interface CurrencyRate {
  id: string;
  currencyA: Currency;
  currencyB: Currency;
  /** Unix time in seconds. */
  date: number;
  /** A pair has buy and sell rates, a cross rate, or both. */
  rateBuy?: number;
  rateSell?: number;
  rateCross?: number;
}

/** A pair's rates on one day, as kept in the rate history. */
export interface RateSnapshot {
  buy?: number;
  sell?: number;
  cross?: number;
}

/** The rates of an earlier day, to show how much each rate changed since. */
export interface RatesSnapshot {
  /** Local date, "YYYY-MM-DD". */
  day: string;
  /** By rate id. */
  rates: Record<string, RateSnapshot>;
}
