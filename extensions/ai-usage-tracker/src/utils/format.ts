import { formatDistanceToNow } from "date-fns";

export function formatResetTime(date: Date | null): string {
  if (!date) return "";
  const now = new Date();
  if (date <= now) return "Resetting...";
  return `Resets ${formatDistanceToNow(date, { addSuffix: true })}`;
}

export function formatResetTimeShort(date: Date | null): string {
  if (!date) return "";
  const now = new Date();
  if (date <= now) return "now";

  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    const remainingHours = diffHours % 24;
    return `${diffDays}d ${remainingHours}h`;
  }

  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes}m`;
  }

  return `${diffMinutes}m`;
}

export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatCost(amount: number): string {
  if (amount === 0) return "--";
  if (amount < 0.01) return "< $0.01";
  return `$${amount.toFixed(2)}`;
}

export function formatTokens(tokens: number): string {
  if (tokens === 0) return "--";
  if (tokens >= 1_000_000_000) {
    return `${(tokens / 1_000_000_000).toFixed(1)}B`;
  }
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}

export function formatLastUpdated(date: Date | null): string {
  if (!date) return "Never";
  return formatDistanceToNow(date, { addSuffix: true });
}

export function createProgressBar(
  percentage: number,
  width: number = 10,
): string {
  const clampedPct = Math.max(0, Math.min(100, percentage));
  const filled = Math.round((clampedPct / 100) * width);
  const empty = width - filled;
  const filledChar = "█";
  const emptyChar = "░";
  return filledChar.repeat(filled) + emptyChar.repeat(empty);
}

export function getProgressColor(percentage: number): string {
  if (percentage >= 90) return "#FF6B6B";
  if (percentage >= 70) return "#FFE66D";
  return "#4ECDC4";
}
