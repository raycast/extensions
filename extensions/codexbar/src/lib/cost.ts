import { parseDate, providerName } from "./format";
import { DayCost, ProviderCost } from "./types";

interface CliDay {
  date: string;
  totalCost?: number | null;
  totalTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
  modelBreakdowns?: { modelName: string; cost?: number | null; totalTokens?: number }[];
}

interface CliCostEntry {
  provider: string;
  currencyCode?: string;
  sessionCostUSD?: number | null;
  sessionTokens?: number | null;
  last30DaysCostUSD?: number | null;
  last30DaysTokens?: number | null;
  updatedAt?: string;
  daily?: CliDay[];
  error?: { message?: string } | string | null;
}

const orUndefined = (value: number | null | undefined) => (typeof value === "number" ? value : undefined);

function toDay(day: CliDay): DayCost {
  return {
    date: day.date,
    cost: orUndefined(day.totalCost),
    tokens: day.totalTokens ?? 0,
    inputTokens: day.inputTokens,
    outputTokens: day.outputTokens,
    cacheReadTokens: day.cacheReadTokens,
    cacheCreationTokens: day.cacheCreationTokens,
    models: (day.modelBreakdowns ?? [])
      .map((model) => ({ model: model.modelName, cost: orUndefined(model.cost), tokens: model.totalTokens }))
      .sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0)),
  };
}

/** Parses `codexbar cost --format json`; days are returned newest first. */
export function parseCostCli(json: unknown): ProviderCost[] {
  if (!Array.isArray(json)) throw new Error("Unexpected output from codexbar cost");
  return (json as CliCostEntry[]).map((entry) => ({
    provider: entry.provider,
    name: providerName(entry.provider),
    currency: entry.currencyCode ?? "USD",
    todayCost: orUndefined(entry.sessionCostUSD),
    todayTokens: orUndefined(entry.sessionTokens),
    last30DaysCost: orUndefined(entry.last30DaysCostUSD),
    last30DaysTokens: orUndefined(entry.last30DaysTokens),
    days: (entry.daily ?? []).map(toDay).sort((a, b) => b.date.localeCompare(a.date)),
    updatedAt: parseDate(entry.updatedAt),
    error: entry.error
      ? typeof entry.error === "string"
        ? entry.error
        : (entry.error.message ?? "Unknown error")
      : undefined,
  }));
}

/** Providers worth showing: some recorded activity and no error. */
export function activeCostProviders(costs: ProviderCost[]): ProviderCost[] {
  return costs.filter((entry) => !entry.error && (entry.days.length > 0 || (entry.last30DaysTokens ?? 0) > 0));
}
