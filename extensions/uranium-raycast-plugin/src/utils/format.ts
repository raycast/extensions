/**
 * Format number with thousands separators
 * @param num - Number to format
 * @returns Formatted number string
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

/**
 * Format file size in human readable format
 * @param bytes - Size in bytes
 * @returns Formatted size string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Truncate string to specified length with ellipsis
 * @param str - String to truncate
 * @param maxLength - Maximum length
 * @returns Truncated string
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

/**
 * Format blockchain address (show first and last 4 characters)
 * @param address - Full blockchain address
 * @returns Shortened address (e.g., "0x1234...abcd")
 */
export function formatAddress(address: string | null | undefined): string {
  if (!address) return "N/A";
  if (address.length < 10) return address;

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Capitalize first letter of each word
 * @param str - String to capitalize
 * @returns Capitalized string
 */
export function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Format contract/asset status for display
 * @param status - Status string from API
 * @returns Formatted status string
 */
export function formatStatus(status: string): string {
  return capitalizeWords(status.toLowerCase().replace(/_/g, " "));
}
