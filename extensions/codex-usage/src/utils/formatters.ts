export function formatPercentage(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

export function formatUsage(used: number, limit: number): string {
  return `${used}/${limit}`;
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();

  if (diff <= 0) return "Reset now";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function getTintColor(ratio: number): string {
  const percentage = ratio * 100;
  if (percentage >= 90) return "#FF453A"; // Red
  if (percentage >= 75) return "#FF9500"; // Orange
  if (percentage >= 50) return "#FFCC00"; // Yellow
  return "#30D158"; // Green
}

export function getStatusEmoji(ratio: number): string {
  const percentage = ratio * 100;
  if (percentage >= 90) return "🔴";
  if (percentage >= 75) return "🟠";
  if (percentage >= 50) return "🟡";
  return "🟢";
}
