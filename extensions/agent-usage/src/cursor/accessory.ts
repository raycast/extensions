import { formatPercentDisplay, toDisplayPercent, type PercentageDisplayMode } from "../agents/percentage-display.ts";
import type { CursorUsage } from "./types.ts";

export function formatPercent(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function percentLabel(percentageRemaining: number, mode: PercentageDisplayMode): string {
  return formatPercentDisplay(percentageRemaining, mode, formatPercent);
}

export function formatCursorAccessory(
  usage: CursorUsage,
  mode: PercentageDisplayMode,
): {
  remainingForIcon: number;
  text: string;
  tooltip: string;
} {
  if (usage.auto && usage.api) {
    const auto = formatPercent(toDisplayPercent(usage.auto.percentageRemaining, mode));
    const api = formatPercent(toDisplayPercent(usage.api.percentageRemaining, mode));
    return {
      remainingForIcon: Math.min(usage.auto.percentageRemaining, usage.api.percentageRemaining),
      text: `Auto ${auto}%  API ${api}%`,
      tooltip: `Auto: ${percentLabel(usage.auto.percentageRemaining, mode)} | API: ${percentLabel(usage.api.percentageRemaining, mode)}`,
    };
  }

  if (usage.auto) {
    const remaining = usage.auto.percentageRemaining;
    return {
      remainingForIcon: remaining,
      text: `Auto ${formatPercent(toDisplayPercent(remaining, mode))}%`,
      tooltip: `Auto: ${percentLabel(remaining, mode)}`,
    };
  }

  if (usage.api) {
    const remaining = usage.api.percentageRemaining;
    return {
      remainingForIcon: remaining,
      text: `API ${formatPercent(toDisplayPercent(remaining, mode))}%`,
      tooltip: `API: ${percentLabel(remaining, mode)}`,
    };
  }

  const remaining = usage.total.percentageRemaining;
  const label = usage.legacyRequests ? "Requests" : "Total";
  return {
    remainingForIcon: remaining,
    text: `${formatPercent(toDisplayPercent(remaining, mode))}%`,
    tooltip: `${label}: ${percentLabel(remaining, mode)}`,
  };
}
