import type { CodexBudgetSnapshot } from "./codex-budget";
import { CODEX_BUDGET_WINDOW_MS } from "./codex-budget";
import {
  formatCurrencyMoney,
  formatShortDate,
  getPeriodCalendarBounds,
} from "./format";
import { budgetPeriodForProvider } from "./budget";
import type { SourceProviderKey } from "./types";

export type BudgetPaceStatus =
  | "inactive"
  | "no_spend"
  | "over_budget"
  | "on_pace"
  | "under_pace";

export type BudgetPaceSnapshot = {
  status: BudgetPaceStatus;
  /** Full summary for tooltips and detail panel. */
  title: string;
  /** Optional secondary line (projection, under-pace hint). */
  subtitle?: string;
  /** Compact list row accessory strings. */
  listBurn?: string;
  listRemaining?: string;
  /** Short list subtitle (e.g. cap-hit date). */
  listHint?: string;
  /** Detail metadata values (undefined when not applicable). */
  dailyBurn?: string;
  dailyAllowance?: string;
  leftToSpend?: string;
  projection?: string;
};

function compactDailyRate(amountStr: string): string {
  return `${amountStr}/d`;
}

function inclusiveDaysBetween(start: Date, end: Date): number {
  const startDay = new Date(start);
  startDay.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  return Math.round((endDay.getTime() - startDay.getTime()) / 86_400_000) + 1;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addCalendarDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function remainingDaysThrough(end: Date, now = new Date()): number {
  return inclusiveDaysBetween(startOfDay(now), startOfDay(end));
}

type PaceWindow = { start: Date; end: Date };

function paceWindowForProvider(
  provider: SourceProviderKey,
  codexBudget?: CodexBudgetSnapshot,
): PaceWindow | undefined {
  if (provider === "codex") {
    if (!codexBudget?.windowActive) return undefined;
    const start = codexBudget.window.start;
    const end = new Date(start.getTime() + CODEX_BUDGET_WINDOW_MS);
    return { start, end };
  }

  return getPeriodCalendarBounds(budgetPeriodForProvider(provider));
}

function elapsedDaysInWindow(window: PaceWindow, now = new Date()): number {
  return inclusiveDaysBetween(window.start, startOfDay(now));
}

function computePaceMetrics(
  spend: number,
  cap: number,
  window: PaceWindow,
  now = new Date(),
): {
  elapsedDays: number;
  remainingDays: number;
  remaining: number;
  dailyBurn: number;
  dailyAllowance: number;
  projectedHitDate: Date | undefined;
} {
  const elapsedDays = Math.max(elapsedDaysInWindow(window, now), 1);
  const remainingDays = Math.max(remainingDaysThrough(window.end, now), 1);
  const remaining = Math.max(cap - spend, 0);
  const dailyBurn = spend / elapsedDays;
  const dailyAllowance = remaining / remainingDays;

  let projectedHitDate: Date | undefined;
  if (dailyBurn > 0 && remaining > 0) {
    const daysUntilCap = Math.ceil(remaining / dailyBurn);
    projectedHitDate = addCalendarDays(startOfDay(now), daysUntilCap);
  }

  return {
    elapsedDays,
    remainingDays,
    remaining,
    dailyBurn,
    dailyAllowance,
    projectedHitDate,
  };
}

function isProjectionMeaningful(
  projectedHitDate: Date,
  windowEnd: Date,
  spend: number,
): boolean {
  if (spend <= 0) return false;
  return (
    startOfDay(projectedHitDate).getTime() <= startOfDay(windowEnd).getTime()
  );
}

/** Spend pace for the provider's native budget window. */
export function computeBudgetPace(
  provider: SourceProviderKey,
  spend: number,
  cap: number,
  currency: string,
  codexBudget?: CodexBudgetSnapshot,
  now = new Date(),
): BudgetPaceSnapshot {
  if (provider === "codex" && codexBudget && !codexBudget.windowActive) {
    return {
      status: "inactive",
      title: "Starts on next use",
      listHint: "Next use",
    };
  }

  if (spend <= 0) {
    return {
      status: "no_spend",
      title: "No spend yet",
    };
  }

  if (cap > 0 && spend >= cap) {
    return {
      status: "over_budget",
      title: spend > cap ? "Over budget" : "Cap reached",
      listHint: spend > cap ? "Over cap" : "Cap reached",
      leftToSpend: formatCurrencyMoney(0, currency),
    };
  }

  const window = paceWindowForProvider(provider, codexBudget);
  if (!window) {
    return {
      status: "inactive",
      title: "Starts on next use",
      listHint: "Next use",
    };
  }

  const metrics = computePaceMetrics(spend, cap, window, now);
  const dailyBurnStr = formatCurrencyMoney(metrics.dailyBurn, currency);
  const dailyAllowanceStr = formatCurrencyMoney(
    metrics.dailyAllowance,
    currency,
  );
  const leftStr = formatCurrencyMoney(metrics.remaining, currency);
  const title = `${dailyBurnStr}/day · ${leftStr} left to spend`;

  let subtitle: string | undefined;
  let projection: string | undefined;
  let status: BudgetPaceStatus = "on_pace";

  let listHint: string | undefined;

  if (
    metrics.projectedHitDate &&
    isProjectionMeaningful(metrics.projectedHitDate, window.end, spend)
  ) {
    const hitLabel = formatShortDate(metrics.projectedHitDate);
    projection = `Cap ${hitLabel}`;
    subtitle = `On pace to hit cap ${hitLabel}`;
    listHint = projection;
  } else if (metrics.dailyBurn < metrics.dailyAllowance * 0.95) {
    status = "under_pace";
    subtitle = "Under budget pace";
    listHint = "Under pace";
  }

  return {
    status,
    title,
    subtitle,
    listBurn: compactDailyRate(dailyBurnStr),
    listRemaining: `${leftStr} left`,
    listHint,
    dailyBurn: `${dailyBurnStr}/day`,
    dailyAllowance: `${dailyAllowanceStr}/day`,
    leftToSpend: leftStr,
    projection,
  };
}
