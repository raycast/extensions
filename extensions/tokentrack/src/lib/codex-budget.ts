import { formatDateRangeCompact } from "./format";
import type { DateRange, UsageMetric } from "./types";

/** Codex weekly guardrail length (matches Codex CLI /status weekly window). */
export const CODEX_BUDGET_WINDOW_MS = 7 * 86_400_000;

/** Look back far enough to anchor the current window across month boundaries. */
const CODEX_BUDGET_SCAN_DAYS = 56;

export type CodexBudgetSnapshot = {
  spend: number;
  window: DateRange;
  /** False when the prior window expired and no new usage has started the next one. */
  windowActive: boolean;
};

type BudgetPoint = { t: number; cost: number };

export function getCodexBudgetLoadRange(now = new Date()): DateRange {
  const end = new Date(now);
  const start = new Date(now);
  start.setDate(start.getDate() - CODEX_BUDGET_SCAN_DAYS);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

/**
 * Codex weekly limits use a rolling 7-day window anchored to the first usage
 * after the prior window ends (not a calendar week). See openai/codex#11879.
 */
export function computeCodexBudgetWindow(
  points: BudgetPoint[],
  now = new Date(),
): CodexBudgetSnapshot {
  const nowMs = now.getTime();

  if (points.length === 0) {
    return {
      spend: 0,
      window: {
        start: new Date(nowMs - CODEX_BUDGET_WINDOW_MS),
        end: now,
      },
      windowActive: false,
    };
  }

  const sorted = [...points].sort((a, b) => a.t - b.t);

  let windowStartMs = sorted[0].t;
  let windowEndMs = windowStartMs + CODEX_BUDGET_WINDOW_MS;

  for (const point of sorted) {
    if (point.t >= windowEndMs) {
      windowStartMs = point.t;
      windowEndMs = windowStartMs + CODEX_BUDGET_WINDOW_MS;
    }
  }

  const windowActive = nowMs < windowEndMs;
  let spend = 0;

  for (const point of sorted) {
    if (point.t >= windowStartMs && point.t <= nowMs) {
      spend += point.cost;
    }
  }

  return {
    spend,
    window: {
      start: new Date(windowStartMs),
      end: windowActive ? now : new Date(windowEndMs),
    },
    windowActive,
  };
}

export function createCodexBudgetAccumulator() {
  const points: BudgetPoint[] = [];

  return {
    addMetric(metric: UsageMetric) {
      if (metric.totalTokens <= 0 && metric.estimatedCost <= 0) return;
      points.push({
        t: metric.timestamp.getTime(),
        cost: metric.estimatedCost,
      });
    },

    build(now = new Date()): CodexBudgetSnapshot {
      return computeCodexBudgetWindow(points, now);
    },
  };
}

export function formatCodexBudgetSpanLabel(
  snapshot: CodexBudgetSnapshot,
): string {
  if (!snapshot.windowActive) return "Starts on next use";
  return formatDateRangeCompact(snapshot.window.start, snapshot.window.end);
}
