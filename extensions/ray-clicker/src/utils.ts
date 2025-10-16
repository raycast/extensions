export function formatNumber(num: number | string): string {
  const number = typeof num === "string" ? parseFloat(num) : num;
  if (isNaN(number)) return "0";

  if (number >= 1000000000) {
    return (number / 1000000000).toFixed(1) + "B";
  }
  if (number >= 1000000) {
    return (number / 1000000).toFixed(1) + "M";
  }
  if (number >= 1000) {
    return (number / 1000).toFixed(1) + "K";
  }

  // For numbers between 0 and 1000, show up to 2 decimal places if needed
  const fixed = number.toFixed(2);
  return fixed.endsWith(".00") ? fixed.slice(0, -3) : fixed;
}

export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(" ");
}

// Centralized prestige points calculation helper to avoid duplication
export function calculatePrestigePoints(totalEarned: number, divisor: number): number {
  return Math.floor(Math.sqrt((totalEarned || 0) / divisor));
}
