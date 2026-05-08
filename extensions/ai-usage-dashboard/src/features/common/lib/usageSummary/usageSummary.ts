export type DailyUsage = {
  date: string;
  models: string[];
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
  costUSD: number;
};

export type UsageTotals = {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
  costUSD: number;
};

export type UsageSummary = {
  today: UsageTotals;
  monthToDate: UsageTotals;
  total: UsageTotals;
  recentDays: DailyUsage[];
};

type RawDailyUsage = Partial<DailyUsage> & {
  cachedInputTokens?: unknown;
  date?: unknown;
  models?: unknown;
  modelsUsed?: unknown;
  totalCost?: unknown;
};

const zeroTotals = (): UsageTotals => ({
  inputTokens: 0,
  outputTokens: 0,
  cacheCreationTokens: 0,
  cacheReadTokens: 0,
  totalTokens: 0,
  costUSD: 0,
});

const numberOrZero = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addUsage = (totals: UsageTotals, usage: DailyUsage): UsageTotals => ({
  inputTokens: totals.inputTokens + usage.inputTokens,
  outputTokens: totals.outputTokens + usage.outputTokens,
  cacheCreationTokens: totals.cacheCreationTokens + usage.cacheCreationTokens,
  cacheReadTokens: totals.cacheReadTokens + usage.cacheReadTokens,
  totalTokens: totals.totalTokens + usage.totalTokens,
  costUSD: totals.costUSD + usage.costUSD,
});

const normalizeModels = (row: RawDailyUsage): string[] => {
  if (
    row.models &&
    typeof row.models === "object" &&
    !Array.isArray(row.models)
  ) {
    return Object.keys(row.models);
  }

  const models = Array.isArray(row.models) ? row.models : row.modelsUsed;

  return Array.isArray(models)
    ? models.filter((model): model is string => typeof model === "string")
    : [];
};

const normalizeDate = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : toLocalDateString(parsed);
};

export const parseDailyUsage = (stdout: string): DailyUsage[] => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new Error("Unable to parse ccusage JSON output");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error(
      "Expected ccusage daily output to include a daily or data array",
    );
  }

  const rows =
    (parsed as { daily?: unknown; data?: unknown }).daily ??
    (parsed as { data?: unknown }).data;

  if (!Array.isArray(rows)) {
    throw new Error(
      "Expected ccusage daily output to include a daily or data array",
    );
  }

  return (rows as RawDailyUsage[]).map((row) => ({
    date: normalizeDate(row.date),
    models: normalizeModels(row),
    inputTokens: numberOrZero(row.inputTokens),
    outputTokens: numberOrZero(row.outputTokens),
    cacheCreationTokens: numberOrZero(row.cacheCreationTokens),
    cacheReadTokens: numberOrZero(row.cacheReadTokens ?? row.cachedInputTokens),
    totalTokens: numberOrZero(row.totalTokens),
    costUSD: numberOrZero(row.costUSD ?? row.totalCost),
  }));
};

export const summarizeDailyUsage = (
  rows: DailyUsage[],
  now = new Date(),
): UsageSummary => {
  const todayKey = toLocalDateString(now);
  const monthKey = todayKey.slice(0, 7);
  const sortedRows = [...rows].sort((a, b) => b.date.localeCompare(a.date));

  return {
    today: rows
      .filter((row) => row.date === todayKey)
      .reduce(addUsage, zeroTotals()),
    monthToDate: rows
      .filter((row) => row.date.startsWith(monthKey))
      .reduce(addUsage, zeroTotals()),
    total: rows.reduce(addUsage, zeroTotals()),
    recentDays: sortedRows.slice(0, 7),
  };
};
