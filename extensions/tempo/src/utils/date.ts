/**
 * Format a date string for display
 * Shows "Today", "Yesterday", or formatted date
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Formatted date string
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const dateOnly = today.toISOString().split("T")[0];
  const yesterdayOnly = yesterday.toISOString().split("T")[0];

  if (dateString === dateOnly) {
    return "Today";
  } else if (dateString === yesterdayOnly) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

/**
 * Get label for a date (Today, Yesterday, or formatted date)
 * @param date - Date object or YYYY-MM-DD string
 * @returns Label string
 */
export function getDateLabel(date: Date | string): string {
  const dateStr = typeof date === "string" ? date : formatDateToString(date);
  return formatDate(dateStr);
}

/**
 * Format a Date object to YYYY-MM-DD string
 * @param date - Date object
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get date range for the last N days
 * @param days - Number of days to look back
 * @returns Object with fromDate and toDate in YYYY-MM-DD format
 */
export function getDateRange(days: number): { fromDate: string; toDate: string } {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - days);

  const fromDate = startDate.toISOString().split("T")[0];
  const toDate = tomorrow.toISOString().split("T")[0];

  return { fromDate, toDate };
}
