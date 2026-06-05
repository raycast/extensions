import type { CodexBudgetSnapshot } from "./codex-budget";
import { formatCodexBudgetSpanLabel } from "./codex-budget";
import {
  formatCurrencyMoney,
  formatDateRangeCompact,
  getPeriodCalendarBounds,
  periodLabels,
  type PeriodKey,
} from "./format";
import type { SourceProviderKey } from "./types";

export const BUDGET_DEFAULTS: Record<SourceProviderKey, number> = {
  claude: 300,
  codex: 100,
  cursor: 300,
};

export function budgetCadenceForProvider(
  provider: SourceProviderKey,
): "weekly" | "monthly" {
  return provider === "codex" ? "weekly" : "monthly";
}

/** Calendar window that the provider's fixed budget applies to. */
export function budgetPeriodForProvider(
  provider: SourceProviderKey,
): PeriodKey {
  return provider === "codex" ? "week" : "month";
}

export function budgetRowTitle(provider: SourceProviderKey): string {
  void provider;
  return "Limit";
}

export function budgetPeriodLabel(provider: SourceProviderKey): string {
  if (provider === "codex") return "Rolling Week";
  return periodLabels[budgetPeriodForProvider(provider)];
}

function preferenceBudgetRaw(
  prefs: Preferences,
  provider: SourceProviderKey,
): string {
  return provider === "claude"
    ? prefs.claudeBudget
    : provider === "codex"
      ? prefs.codexBudget
      : prefs.cursorBudget;
}

/** Fixed native cap from preferences, falling back to manifest defaults. */
export function getProviderBudgetAmount(
  prefs: Preferences,
  provider: SourceProviderKey,
): number {
  const val = Number(preferenceBudgetRaw(prefs, provider));
  if (Number.isFinite(val) && val > 0) return val;
  return BUDGET_DEFAULTS[provider];
}

export function formatNativeBudgetCap(
  provider: SourceProviderKey,
  nativeAmount: number,
  currency: string,
): string {
  const formatted = formatCurrencyMoney(nativeAmount, currency);
  return provider === "codex" ? `${formatted} / week` : `${formatted} / month`;
}

/** Compact cap for list row accessories. */
export function formatBudgetCapCompact(
  amount: number,
  currency: string,
): string {
  return formatCurrencyMoney(amount, currency);
}

/** Span label for the provider's budget window. */
export function formatBudgetSpanLabel(
  provider: SourceProviderKey,
  codexBudget?: CodexBudgetSnapshot,
): string {
  if (provider === "codex") {
    if (codexBudget) return formatCodexBudgetSpanLabel(codexBudget);
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 86_400_000);
    return formatDateRangeCompact(start, end);
  }

  const period = budgetPeriodForProvider(provider);
  const { start, end } = getPeriodCalendarBounds(period);
  return formatDateRangeCompact(start, end);
}

/** Spend total for the provider's native budget window. */
export function budgetSpendForProvider(
  provider: SourceProviderKey,
  periods: Record<PeriodKey, { estimatedCost: number }>,
  codexBudget?: CodexBudgetSnapshot,
): number {
  if (provider === "codex" && codexBudget) return codexBudget.spend;
  const period = budgetPeriodForProvider(provider);
  return periods[period]?.estimatedCost ?? 0;
}
