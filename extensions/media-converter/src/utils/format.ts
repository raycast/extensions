/**
 * Human-friendly byte formatter: 1536 -> "1.5 KB".
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) return "0 B";
  const abs = Math.abs(bytes);
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let value = abs;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  const rounded = value >= 100 || i === 0 ? Math.round(value).toString() : value.toFixed(1);
  const sign = bytes < 0 ? "-" : "";
  return `${sign}${rounded} ${units[i]}`;
}

/**
 * Format a delta like "-42.3 MB (58%)" or "+3.2 MB (larger)" for size comparisons.
 */
export function formatSavings(inputBytes: number, outputBytes: number): string {
  const delta = outputBytes - inputBytes;
  if (inputBytes <= 0) return formatBytes(outputBytes);
  const pct = Math.round((Math.abs(delta) / inputBytes) * 100);
  if (delta <= 0) {
    return `saved ${formatBytes(-delta)} (${pct}%)`;
  }
  return `+${formatBytes(delta)} larger (${pct}%)`;
}
