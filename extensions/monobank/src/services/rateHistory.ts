import { RATE_HISTORY_DAYS, STORAGE_KEYS } from "../data/constants";
import { MOCK_API } from "../mocks/config";
import { getMockRateHistory } from "../mocks/rates";
import { CurrencyRate, RateSnapshot, RatesSnapshot } from "../types";
import { pad } from "./format";
import { readJson, writeJson } from "./storage";

/**
 * monobank has no rate history, so the extension keeps the last rates it saw on each day, by local date
 * ("YYYY-MM-DD") and rate id. Only the newest `RATE_HISTORY_DAYS` days are kept.
 */
interface RateHistory {
  days: Record<string, Record<string, RateSnapshot>>;
}

/** A local date as "YYYY-MM-DD". `time` is unix milliseconds. */
export function toLocalDay(time: number) {
  const date = new Date(time);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toSnapshots(rates: CurrencyRate[]): Record<string, RateSnapshot> {
  return Object.fromEntries(
    rates.map((rate) => [rate.id, { buy: rate.rateBuy, sell: rate.rateSell, cross: rate.rateCross }]),
  );
}

/** The stored history. With mocks, days missing from it are filled with mock rates, so it's full from the start. */
async function readHistory(): Promise<RateHistory | undefined> {
  const history = await readJson<RateHistory>(STORAGE_KEYS.rateHistory);
  if (!MOCK_API) return history;

  const days = { ...history?.days };
  for (const { at, rates } of getMockRateHistory(Date.now())) {
    days[toLocalDay(at)] ??= toSnapshots(rates);
  }
  return { days };
}

/**
 * Saves freshly fetched rates as the snapshot of the day they were fetched on, replacing an earlier one from
 * that day, so each day keeps its last rates. Never throws: a storage failure must not break loading rates.
 */
export async function recordRates(rates: CurrencyRate[], at = Date.now()) {
  if (!rates.length) return;

  try {
    const history = await readHistory();
    const days = { ...history?.days };

    days[toLocalDay(at)] = toSnapshots(rates);

    // "YYYY-MM-DD" sorts by date.
    const kept = Object.keys(days).sort().slice(-RATE_HISTORY_DAYS);
    await writeJson(STORAGE_KEYS.rateHistory, {
      days: Object.fromEntries(kept.map((day) => [day, days[day]])),
    } satisfies RateHistory);
  } catch (error) {
    console.error(error);
  }
}

/**
 * The newest snapshot from before `beforeDay` ("YYYY-MM-DD"), usually yesterday's. Pass the day of the rates
 * being shown, so rates cached yesterday are compared with the day before, not with themselves.
 */
export async function getPreviousSnapshot(beforeDay: string): Promise<RatesSnapshot | undefined> {
  try {
    const history = await readHistory();
    const day = Object.keys(history?.days ?? {})
      .filter((day) => day < beforeDay)
      .sort()
      .pop();

    return day ? { day, rates: history!.days[day] } : undefined;
  } catch (error) {
    console.error(error);
    return undefined;
  }
}
