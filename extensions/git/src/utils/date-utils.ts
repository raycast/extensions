/**
 * Custom date formatter for Raycast accessories
 *
 * Formats dates based on day distance from current date:
 * - Today (0 days): only time (HH:MM)
 * - Recent (1-30 days): time day month
 * - This year (31-365 days): day month
 * - Previous years (365+ days): month year
 */

/**
 * Formats a Date object to a string based on its age relative to today
 * Order: <time><day><month><year> using toLocaleDateString for components
 * Based on day distance from current date rather than month/year equality
 * @param date - The date to format
 * @returns Formatted date string
 */
function formatRelativeDate(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  // Today (0 days difference)
  if (targetDate.getTime() === today.getTime()) {
    // Today: display only time (HH:MM)
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  // Within ~30 days (approximately a month)
  if (date.getFullYear() === now.getFullYear()) {
    // Recent: display time day month
    const time = date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const day = date.toLocaleDateString(undefined, { day: "numeric" });
    const month = date.toLocaleDateString(undefined, { month: "short" });
    return `${day} ${month} at ${time}`;
  }

  // More than a year ago or in the future
  const day = date.toLocaleDateString(undefined, { day: "numeric" });
  const month = date.toLocaleDateString(undefined, { month: "short" });
  const year = date.toLocaleDateString(undefined, { year: "numeric" });
  return `${day} ${month} ${year}`;
}

export {};
/**
 * Extend Date prototype with toRelativeDateString method
 */
declare global {
  interface Date {
    toRelativeDateString(): string;
  }
}

// Add the method to Date prototype
Date.prototype.toRelativeDateString = function (): string {
  return formatRelativeDate(this);
};
