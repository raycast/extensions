/**
 * Format bytes to human-readable string
 */
export function prettyBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let unitIndex = 0;
  let value = bytes;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  // No decimals for bytes, 2 decimals for larger units
  const decimals = unitIndex === 0 ? 0 : 2;
  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
}

/**
 * Calculate savings percentage
 */
export function savingsPercent(before: number, after: number): string {
  if (before === 0) return "0%";
  const savings = ((before - after) / before) * 100;
  return `${savings.toFixed(1)}%`;
}
