const MS_PER_DAY = 1000 * 60 * 60 * 24;
const RELATIVE_DATE_THRESHOLD = 7;

/**
 * Format a date string to RFC 3339 format for API
 */
export function toRFC3339(date: Date): string {
  return date.toISOString();
}

/**
 * Format a date string for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a relative date for display
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / MS_PER_DAY);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 0 && diffDays <= RELATIVE_DATE_THRESHOLD) return `In ${diffDays} days`;
  if (diffDays < 0 && diffDays >= -RELATIVE_DATE_THRESHOLD) return `${Math.abs(diffDays)} days ago`;

  return formatDate(dateString);
}

/**
 * Check if a date is overdue
 */
export function isOverdue(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return date < now;
}
