import { isSupportedRate, toCurrencyRate } from "../api/mappers";
import { CurrencyRateResponse } from "../api/types";
import { RATE_HISTORY_DAYS } from "../data/constants";
import { CurrencyRate } from "../types";
import { createRandom } from "./random";

const UAH = 980;
/** Rates change once per slot of this many hours. */
const SLOT_HOURS = 4;
/** Day 0 of the daily drift. */
const EPOCH = new Date(2026, 0, 1);

interface Pair {
  a: number;
  b: number;
  /** The rate on an average day. */
  mid: number;
  /** Relative difference between sell and buy. Pairs without one have only a cross rate. */
  spread?: number;
}

// Roughly monobank's set: a few pairs with buy and sell, the rest cross only.
const pairs: Pair[] = [
  { a: 840, b: UAH, mid: 41.75, spread: 0.007 }, // USD
  { a: 978, b: UAH, mid: 48.4, spread: 0.008 }, // EUR
  { a: 978, b: 840, mid: 1.159, spread: 0.0045 }, // EUR / USD
  { a: 985, b: UAH, mid: 11.38, spread: 0.015 }, // PLN
  { a: 826, b: UAH, mid: 55.6, spread: 0.012 }, // GBP
  { a: 756, b: UAH, mid: 51.8, spread: 0.015 }, // CHF
  { a: 203, b: UAH, mid: 1.99 }, // CZK
  { a: 392, b: UAH, mid: 0.2755 }, // JPY
  { a: 124, b: UAH, mid: 30.1 }, // CAD
  { a: 156, b: UAH, mid: 5.86 }, // CNY
  { a: 949, b: UAH, mid: 0.99 }, // TRY
  { a: 36, b: UAH, mid: 27.4 }, // AUD, which monobank sends as 36, not 036
  { a: 752, b: UAH, mid: 4.42 }, // SEK
  { a: 578, b: UAH, mid: 4.12 }, // NOK
  { a: 348, b: UAH, mid: 0.1245 }, // HUF
  { a: 981, b: UAH, mid: 15.45 }, // GEL
  { a: 398, b: UAH, mid: 0.0815 }, // KZT
  { a: 498, b: UAH, mid: 2.46 }, // MDL
  { a: 1, b: UAH, mid: 3.3 }, // Not an ISO 4217 code, to exercise `isSupportedRate`.
];

function getDayNumber(date: Date) {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  // Rounded, since a day with a DST change is 23 or 25 hours long.
  return Math.round((day.getTime() - EPOCH.getTime()) / 86_400_000);
}

/** The rate's multiplier at `time`: a slow wave and a daily step, plus a small change per slot. */
function getDrift(pair: Pair, time: number) {
  const date = new Date(time);
  const day = getDayNumber(date);
  const slot = Math.floor(date.getHours() / SLOT_HOURS);
  const key = `${pair.a}-${pair.b}`;
  const phase = createRandom(key).next() * Math.PI * 2;

  const wave = 0.02 * Math.sin(day / 17 + phase);
  const daily = 0.012 * (createRandom(`${key}:${day}`).next() - 0.5);
  const slotly = 0.003 * (createRandom(`${key}:${day}:${slot}`).next() - 0.5);
  return 1 + wave + daily + slotly;
}

function round(value: number) {
  return Number(value.toFixed(4));
}

/** Unix seconds of the start of `time`'s slot. */
function getSlotStart(time: number) {
  const date = new Date(time);
  const hour = Math.floor(date.getHours() / SLOT_HOURS) * SLOT_HOURS;
  return Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour).getTime() / 1000);
}

/** `GET /bank/currency` as it would answer at `time` (unix ms). Deterministic for each slot. */
export function getMockRates(time: number): CurrencyRateResponse[] {
  const date = getSlotStart(time);

  return pairs.map((pair) => {
    const mid = pair.mid * getDrift(pair, time);
    if (pair.spread === undefined) {
      return { currencyCodeA: pair.a, currencyCodeB: pair.b, date, rateCross: round(mid) };
    }
    return {
      currencyCodeA: pair.a,
      currencyCodeB: pair.b,
      date,
      rateBuy: round(mid * (1 - pair.spread / 2)),
      rateSell: round(mid * (1 + pair.spread / 2)),
    };
  });
}

/** UAH per unit of `currencyCode` at `time` (unix ms), between buy and sell. 1 for UAH and unknown codes. */
export function getMockUahRate(currencyCode: number, time: number) {
  const pair = pairs.find((pair) => pair.a === currencyCode && pair.b === UAH);
  return pair ? pair.mid * getDrift(pair, time) : 1;
}

/**
 * The rates the extension would have recorded on each of the `RATE_HISTORY_DAYS` days before `now`'s day
 * (the last slot of each day), oldest first.
 */
export function getMockRateHistory(now: number): { at: number; rates: CurrencyRate[] }[] {
  const today = new Date(now);

  return Array.from({ length: RATE_HISTORY_DAYS }, (_, i) => {
    const at = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (RATE_HISTORY_DAYS - i), 22).getTime();
    return { at, rates: getMockRates(at).filter(isSupportedRate).map(toCurrencyRate) };
  });
}
