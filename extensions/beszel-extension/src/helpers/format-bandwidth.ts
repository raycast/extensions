const UNITS = ["B/s", "KB/s", "MB/s", "GB/s", "TB/s"];

/**
 * Format a bandwidth value in bytes per second into a human readable rate.
 */
export function formatBandwidth(bytesPerSecond: number): string {
  let value = bytesPerSecond;
  let unit = 0;

  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit++;
  }

  // Show decimals only once we're past raw bytes and below 10 for readability.
  const digits = unit > 0 && value < 10 ? 2 : unit > 0 ? 1 : 0;

  return `${value.toFixed(digits)} ${UNITS[unit]}`;
}
