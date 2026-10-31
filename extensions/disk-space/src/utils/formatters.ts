const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB", "EB"] as const;

/**
 * Formats a byte number into human-readable 1024-base units (B, KB, MB, GB, TB, PB).
 * @param bytes Number of bytes to format
 * @param decimals Number of decimal digits to display (default: 1)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (isNaN(bytes) || !isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const k = 1024;
  const dm = Math.max(0, decimals);
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const unitIndex = Math.max(0, Math.min(i, BYTE_UNITS.length - 1));

  if (unitIndex === 0) {
    return `${Math.round(bytes)} B`;
  }

  let value = bytes / Math.pow(k, unitIndex);
  let finalIndex = unitIndex;
  if (
    parseFloat(value.toFixed(dm)) >= k &&
    finalIndex < BYTE_UNITS.length - 1
  ) {
    value /= k;
    finalIndex++;
  }

  return `${value.toFixed(dm)} ${BYTE_UNITS[finalIndex]}`;
}

/**
 * Formats an exact byte number with locale commas and 'B' suffix.
 * Example: 1073741824 -> "1,073,741,824 B"
 */
export function formatExactBytes(bytes: number): string {
  if (isNaN(bytes) || !isFinite(bytes) || bytes < 0) {
    return "0 B";
  }

  const rounded = Math.round(bytes);
  return `${rounded.toLocaleString("en-US")} B`;
}

/**
 * Formats a usage percentage value with a '%' suffix.
 * Clamps input between 0.0% and 100.0% unless specified.
 * @param percent Numeric percentage between 0 and 100
 * @param decimals Number of decimal digits (default: 1)
 */
export function formatPercent(percent: number, decimals = 1): string {
  if (isNaN(percent) || !isFinite(percent)) {
    return "0.0%";
  }

  const clamped = Math.max(0, Math.min(100, percent));
  return `${clamped.toFixed(decimals)}%`;
}
