/**
 * Size formatting utilities
 * Consistent byte and data size formatting
 */

export interface SizeFormatOptions {
  decimals?: number;
  binary?: boolean; // Use 1024 instead of 1000
  longFormat?: boolean; // Use "bytes" instead of "B"
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number, options: SizeFormatOptions = {}): string {
  const { decimals = 1, binary = true, longFormat = false } = options;

  if (bytes === 0) return longFormat ? "0 bytes" : "0 B";
  if (bytes === 1) return longFormat ? "1 byte" : "1 B";

  const k = binary ? 1024 : 1000;
  const dm = decimals < 0 ? 0 : decimals;

  const sizes = longFormat
    ? binary
      ? ["bytes", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"]
      : ["bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
    : binary
      ? ["B", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"]
      : ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));

  return `${size} ${sizes[i]}`;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  return formatBytes(bytes, { decimals: 1, binary: true, longFormat: false });
}

/**
 * Format disk usage with percentage
 */
export function formatDiskUsage(used: number, total: number): string {
  const percentage = total > 0 ? Math.round((used / total) * 100) : 0;
  const usedFormatted = formatBytes(used);
  const totalFormatted = formatBytes(total);

  return `${usedFormatted} / ${totalFormatted} (${percentage}%)`;
}

/**
 * Format memory usage
 */
export function formatMemoryUsage(bytes: number): string {
  return formatBytes(bytes, { decimals: 0, binary: true, longFormat: false });
}

/**
 * Format transfer rate (bytes per second)
 */
export function formatTransferRate(bytesPerSecond: number): string {
  const formatted = formatBytes(bytesPerSecond, { decimals: 1, binary: false });
  return `${formatted}/s`;
}

/**
 * Format large numbers with appropriate suffixes
 */
export function formatNumber(num: number, decimals = 1): string {
  if (num === 0) return "0";

  const k = 1000;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["", "K", "M", "B", "T"];

  const i = Math.floor(Math.log(Math.abs(num)) / Math.log(k));
  const formattedNumber = parseFloat((num / Math.pow(k, i)).toFixed(dm));

  return `${formattedNumber}${sizes[i]}`;
}

/**
 * Parse size string back to bytes
 */
export function parseSize(sizeString: string): number {
  const units: Record<string, number> = {
    b: 1,
    byte: 1,
    bytes: 1,
    kb: 1000,
    kib: 1024,
    mb: 1000 * 1000,
    mib: 1024 * 1024,
    gb: 1000 * 1000 * 1000,
    gib: 1024 * 1024 * 1024,
    tb: 1000 * 1000 * 1000 * 1000,
    tib: 1024 * 1024 * 1024 * 1024,
  };

  const match = sizeString.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]*)?$/);
  if (!match) return 0;

  const [, numberStr, unitStr = "b"] = match;
  const number = parseFloat(numberStr);
  const multiplier = units[unitStr] || 1;

  return Math.round(number * multiplier);
}

/**
 * Format percentage with appropriate precision
 */
export function formatPercentage(value: number, total: number, decimals = 1): string {
  if (total === 0) return "0%";
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Format count with pluralization
 */
export function formatCount(count: number, singular: string, plural?: string): string {
  const pluralForm = plural || `${singular}s`;
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/**
 * Format code lines count
 */
export function formatLinesCount(lines: number): string {
  return formatCount(lines, "line");
}

/**
 * Format file count in directory
 */
export function formatFileCount(files: number, directories: number): string {
  const parts = [];
  if (files > 0) parts.push(formatCount(files, "file"));
  if (directories > 0) parts.push(formatCount(directories, "directory", "directories"));

  if (parts.length === 0) return "Empty";
  if (parts.length === 1) return parts[0];

  return parts.join(", ");
}
