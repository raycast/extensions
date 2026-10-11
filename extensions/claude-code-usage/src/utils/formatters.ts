import { Spend } from "../types";

export function formatPercent(percent: number | null | undefined): string {
  if (percent === null || percent === undefined || !Number.isFinite(percent)) {
    return "0%";
  }
  const clamped = Math.max(0, percent);
  return `${clamped < 10 && clamped > 0 ? clamped.toFixed(1) : Math.round(clamped)}%`;
}

export function formatProgressBar(
  percent: number | null | undefined,
  length = 20,
): string {
  const safePercent =
    percent === null || percent === undefined || !Number.isFinite(percent)
      ? 0
      : Math.max(0, percent);
  const filled = Math.min(
    length,
    Math.max(0, Math.round((safePercent / 100) * length)),
  );
  return "▮".repeat(filled) + "▯".repeat(length - filled);
}

export function formatMoney(
  amount: number,
  currency: string,
  compact = false,
): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const fractionDigits = compact ? 0 : 2;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(safeAmount);
  } catch {
    return `${safeAmount.toFixed(fractionDigits)} ${currency || "USD"}`;
  }
}

export function formatSpend(spend: Spend, compact = false): string {
  const used = formatMoney(spend.usedAmount, spend.currency, compact);
  if (spend.limitAmount === null) {
    return used;
  }
  const limit = formatMoney(spend.limitAmount, spend.currency, compact);
  return compact ? `${used} / ${limit}` : `${used} of ${limit}`;
}

export function formatPlan(plan: string | null): string {
  if (!plan || plan.toLowerCase() === "unknown") {
    return "Unknown";
  }
  const clean = plan.replace(/^claude_/, "");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export function formatTier(tier: string | null): string {
  if (!tier) {
    return "Standard";
  }
  const normalized = tier.toLowerCase();
  if (normalized.includes("20x")) return "Max (20x)";
  if (normalized.includes("5x")) return "Pro (5x)";
  if (normalized.includes("zero")) return "Standard";
  return tier
    .replace(/^default_claude_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatResetTime(resetsAt: number | null | undefined): string {
  if (!resetsAt || !Number.isFinite(resetsAt)) {
    return "";
  }
  const diffMs = resetsAt - Date.now();
  if (diffMs <= 0) {
    return "Resetting soon";
  }

  const mins = Math.ceil(diffMs / 60_000);
  if (mins < 60) {
    return `Resets in ${mins}m`;
  }

  const hours = Math.floor(diffMs / 3_600_000);
  const remainingMins = Math.floor((diffMs % 3_600_000) / 60_000);
  if (hours < 24) {
    return remainingMins > 0
      ? `Resets in ${hours}h ${remainingMins}m`
      : `Resets in ${hours}h`;
  }

  const target = new Date(resetsAt);
  if (diffMs >= 7 * 86_400_000) {
    return `Resets ${target.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })}`;
  }

  return `Resets ${target.toLocaleDateString([], {
    weekday: "short",
    hour: "numeric",
    minute: target.getMinutes() === 0 ? undefined : "2-digit",
  })}`;
}
