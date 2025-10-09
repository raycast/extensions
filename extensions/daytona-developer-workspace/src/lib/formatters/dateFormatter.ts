/**
 * Date formatting utilities
 * Consistent date and time formatting across the application
 */

export interface DateFormatOptions {
  includeTime?: boolean;
  relative?: boolean;
  fallback?: string;
}

/**
 * Format a date string or Date object for display
 */
export function formatDate(date: string | Date | null | undefined, options: DateFormatOptions = {}): string {
  const { includeTime = false, relative = false, fallback = "Unknown" } = options;

  if (!date) return fallback;

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) return fallback;

    if (relative) {
      return formatRelativeTimeInternal(dateObj);
    }

    return includeTime ? dateObj.toLocaleString() : dateObj.toLocaleDateString();
  } catch {
    return fallback;
  }
}

/**
 * Internal helper for relative time formatting
 */
function formatRelativeTimeInternal(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;

  return date.toLocaleDateString();
}

/**
 * Format a date for relative display (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  return formatDate(date, { relative: true });
}

/**
 * Format a date with time for detailed display
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  return formatDate(date, { includeTime: true });
}

/**
 * Format duration in milliseconds to human readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Format execution time for display
 */
export function formatExecutionTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return formatDuration(ms);
}

/**
 * Format a timestamp for log entries
 */
export function formatLogTimestamp(date: string | Date = new Date()): string {
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toISOString().replace("T", " ").substring(0, 19);
  } catch {
    return new Date().toISOString().replace("T", " ").substring(0, 19);
  }
}

/**
 * Format uptime from start date
 */
export function formatUptime(startDate: string | Date): string {
  try {
    const start = typeof startDate === "string" ? new Date(startDate) : startDate;
    const now = new Date();
    const uptimeMs = now.getTime() - start.getTime();
    return formatDuration(uptimeMs);
  } catch {
    return "Unknown";
  }
}

/**
 * Check if a date is today
 */
export function isToday(date: string | Date): boolean {
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const today = new Date();
    return (
      dateObj.getDate() === today.getDate() &&
      dateObj.getMonth() === today.getMonth() &&
      dateObj.getFullYear() === today.getFullYear()
    );
  } catch {
    return false;
  }
}

/**
 * Check if a date was yesterday
 */
export function isYesterday(date: string | Date): boolean {
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return (
      dateObj.getDate() === yesterday.getDate() &&
      dateObj.getMonth() === yesterday.getMonth() &&
      dateObj.getFullYear() === yesterday.getFullYear()
    );
  } catch {
    return false;
  }
}
