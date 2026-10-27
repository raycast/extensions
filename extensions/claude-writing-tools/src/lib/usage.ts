import { Usage } from "./claude";
import { readJson, updateJson, writeJson } from "./store";

export interface UsageTotals {
  requests: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  webSearches: number;
  cost: number;
}

/** Day (YYYY-MM-DD, local time) → model id → totals. */
export type UsageLog = Record<string, Record<string, UsageTotals>>;

const FILE = "usage.json";

export function emptyTotals(): UsageTotals {
  return { requests: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, webSearches: 0, cost: 0 };
}

export function dayKey(date = new Date()): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function addTotals(into: UsageTotals, add: UsageTotals): UsageTotals {
  into.requests += add.requests;
  into.input += add.input;
  into.output += add.output;
  into.cacheRead += add.cacheRead;
  into.cacheWrite += add.cacheWrite;
  into.webSearches += add.webSearches;
  into.cost += add.cost;
  return into;
}

export async function recordUsage(usage: Usage): Promise<void> {
  const day = dayKey();
  await updateJson<UsageLog>(FILE, {}, (log) => {
    const models = (log[day] ??= {});
    addTotals((models[usage.model] ??= emptyTotals()), { ...usage, requests: 1 });
    return log;
  });
}

export function loadUsage(): Promise<UsageLog> {
  return readJson<UsageLog>(FILE, {});
}

export async function resetUsage(): Promise<void> {
  await writeJson(FILE, {});
}
