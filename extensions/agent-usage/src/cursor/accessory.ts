import type { CursorUsage } from "./types.ts";

export function formatPercent(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

export function formatCursorAccessory(usage: CursorUsage): {
  remainingForIcon: number;
  text: string;
  tooltip: string;
} {
  if (usage.auto && usage.api) {
    const auto = formatPercent(usage.auto.percentageRemaining);
    const api = formatPercent(usage.api.percentageRemaining);
    return {
      remainingForIcon: Math.min(usage.auto.percentageRemaining, usage.api.percentageRemaining),
      text: `Auto ${auto}%  API ${api}%`,
      tooltip: `Auto: ${auto}% remaining | API: ${api}% remaining`,
    };
  }

  if (usage.auto) {
    const remaining = usage.auto.percentageRemaining;
    return {
      remainingForIcon: remaining,
      text: `Auto ${formatPercent(remaining)}%`,
      tooltip: `Auto: ${formatPercent(remaining)}% remaining`,
    };
  }

  if (usage.api) {
    const remaining = usage.api.percentageRemaining;
    return {
      remainingForIcon: remaining,
      text: `API ${formatPercent(remaining)}%`,
      tooltip: `API: ${formatPercent(remaining)}% remaining`,
    };
  }

  const remaining = usage.total.percentageRemaining;
  const label = usage.legacyRequests ? "Requests" : "Total";
  return {
    remainingForIcon: remaining,
    text: `${formatPercent(remaining)}%`,
    tooltip: `${label}: ${formatPercent(remaining)}% remaining`,
  };
}
