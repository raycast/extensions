import { Color } from "@raycast/api";

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatTokenCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

export function formatLineCount(added: number, removed: number): string {
  const parts: string[] = [];
  if (added > 0) parts.push(`+${added.toLocaleString()}`);
  if (removed > 0) parts.push(`-${removed.toLocaleString()}`);
  if (parts.length === 0) return "0 lines";
  return `${parts.join(" / ")} lines`;
}

export function formatCost(usd: number): string {
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  if (usd >= 0.01) return `$${usd.toFixed(3)}`;
  if (usd === 0) return "$0.00";
  return `$${usd.toFixed(4)}`;
}

/** API returns extra_usage credits/limits in cents — convert to dollars */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const absDiffMs = Math.abs(diffMs);
  const isFuture = diffMs > 0;

  const minutes = Math.floor(absDiffMs / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  let relative: string;
  if (minutes < 1) relative = "just now";
  else if (minutes < 60) relative = `${minutes}m`;
  else if (hours < 24) relative = `${hours}h ${minutes % 60}m`;
  else relative = `${days}d ${hours % 24}h`;

  if (relative === "just now") return relative;
  return isFuture ? `in ${relative}` : `${relative} ago`;
}

export function getUtilizationColor(pct: number): Color.ColorLike {
  const left = 100 - pct;
  if (left <= 20) return Color.Red;
  if (left <= 60) return Color.Orange;
  return { light: "#1a7f37", dark: "#2ea043" };
}

export function getUtilizationEmoji(pct: number): string {
  const left = 100 - pct;
  if (left <= 20) return "🔴";
  if (left <= 60) return "🟠";
  return "🟢";
}

export function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCodexPlanType(planType: string): string {
  if (!planType) return "Codex";
  return planType.charAt(0).toUpperCase() + planType.slice(1);
}

export function unixToIso(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

export function progressBar(usedPct: number, width = 30): string {
  const clamped = Math.max(0, Math.min(100, usedPct));
  const filled = Math.round((clamped / 100) * width);
  const empty = width - filled;
  return "\u2588".repeat(filled) + "\u2591".repeat(empty);
}

export function formatResetCountdown(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  if (diffMs <= 0) return "now";

  const totalMinutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  const remainingMinutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${remainingHours}h`;
  if (hours > 0) return `${hours}h ${remainingMinutes}m`;
  return `${remainingMinutes}m`;
}
