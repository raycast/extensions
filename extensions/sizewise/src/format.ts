const units = ["KB", "MB", "GB", "TB", "PB", "EB"] as const;

/**
 * Formats a byte count the way Sizewise and Finder do, with Foundation's `ByteCountFormatter`
 * in its file style: decimal units (1 KB is 1,000 bytes), no fraction digits for bytes and KB,
 * one for MB, and two for GB and larger, without trailing zeros.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "Zero KB";
  if (Math.abs(bytes) < 1000) return `${bytes} ${Math.abs(bytes) === 1 ? "byte" : "bytes"}`;
  let value = bytes / 1000;
  let unit = 0;
  while (Math.abs(value) >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  const fractionDigits = unit === 0 ? 0 : unit === 1 ? 1 : 2;
  const number = value.toLocaleString("en-US", { maximumFractionDigits: fractionDigits });
  return `${number} ${units[unit]}`;
}
