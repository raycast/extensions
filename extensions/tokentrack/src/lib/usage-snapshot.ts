import { buildUsageBucketsFromDaily, type UsageBucket } from "./token-chart";
import { getPeriodRange, PERIOD_KEYS, type PeriodKey } from "./format";
import type { CodexBudgetSnapshot } from "./codex-budget";
import type { UsageMetric } from "./types";

export type PeriodUsageSnapshot = {
  totalTokens: number;
  estimatedCost: number;
  hasEstimatedTokens: boolean;
  hasEstimatedCost: boolean;
  buckets: UsageBucket[];
};

export type ProviderUsageSnapshot = {
  errors: string[];
  periods: Record<PeriodKey, PeriodUsageSnapshot>;
  /** Codex only — rolling weekly budget window (first-use anchored). */
  codexBudget?: CodexBudgetSnapshot;
};

type PeriodAccumulator = {
  totalTokens: number;
  estimatedCost: number;
  hasEstimatedTokens: boolean;
  hasEstimatedCost: boolean;
  daily: Map<number, number>;
};

type PeriodBound = {
  period: PeriodKey;
  range: ReturnType<typeof getPeriodRange>;
  startMs: number;
  endMs: number;
};

function dayStartMs(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function emptyAccumulator(): PeriodAccumulator {
  return {
    totalTokens: 0,
    estimatedCost: 0,
    hasEstimatedTokens: false,
    hasEstimatedCost: false,
    daily: new Map(),
  };
}

function periodBounds(): PeriodBound[] {
  return PERIOD_KEYS.map((period) => {
    const range = getPeriodRange(period);
    return {
      period,
      range,
      startMs: range.start.getTime(),
      endMs: range.end.getTime(),
    };
  });
}

/** Stream metrics in without retaining events or large strings (stays under 100 MB heap). */
export function createUsageSnapshotBuilder() {
  const bounds = periodBounds();
  const accumulators = Object.fromEntries(
    PERIOD_KEYS.map((period) => [period, emptyAccumulator()]),
  ) as Record<PeriodKey, PeriodAccumulator>;

  return {
    addMetric(metric: UsageMetric) {
      const t = metric.timestamp.getTime();
      const day = dayStartMs(metric.timestamp);

      for (const { period, startMs, endMs } of bounds) {
        if (t < startMs || t > endMs) continue;

        const acc = accumulators[period];
        acc.totalTokens += metric.totalTokens;
        acc.estimatedCost += metric.estimatedCost;
        acc.hasEstimatedTokens ||= metric.estimatedTokens;
        acc.hasEstimatedCost ||= metric.estimatedCost > 0;
        acc.daily.set(day, (acc.daily.get(day) ?? 0) + metric.totalTokens);
      }
    },

    build(errors: string[]): ProviderUsageSnapshot {
      const periods = {} as Record<PeriodKey, PeriodUsageSnapshot>;
      for (const { period, range } of bounds) {
        const acc = accumulators[period];
        periods[period] = {
          totalTokens: acc.totalTokens,
          estimatedCost: acc.estimatedCost,
          hasEstimatedTokens: acc.hasEstimatedTokens,
          hasEstimatedCost: acc.hasEstimatedCost,
          buckets: buildUsageBucketsFromDaily(period, range, acc.daily),
        };
      }
      return { errors, periods };
    },
  };
}
