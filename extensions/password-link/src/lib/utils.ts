import { getPreferenceValues } from "@raycast/api";

/**
 * Get the base URL from preferences
 * @returns Base URL string
 */
export function getBaseUrl(): string {
  const preferences = getPreferenceValues<{ baseUrl: string }>();
  return preferences.baseUrl || "https://password.link";
}

/**
 * Generate a secret URL
 * @param secretId - Secret ID
 * @param publicPart - Public password part
 * @returns Complete secret URL
 */
export function generateSecretUrl(secretId: string, publicPart: string): string {
  return `${getBaseUrl()}/${secretId}/#${publicPart}`;
}

/**
 * Generate a secret request URL
 * @param requestId - Secret request ID
 * @returns Complete secret request URL
 */
export function generateSecretRequestUrl(requestId: string): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/req/${requestId}`;
}

/**
 * Format date for display
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

/**
 * Format time for display
 * @param dateString - ISO date string
 * @returns Formatted time string
 */
export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Validate email format
 * @param email - Email string to validate
 * @returns true if valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Truncate text to specified length
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Format view count for display
 * @param viewTimes - Number of views
 * @param maxViews - Maximum allowed views (optional)
 * @returns Formatted view string
 */
export function formatViewCount(viewTimes: number, maxViews?: number): string {
  if (viewTimes === 0) {
    return "Not viewed";
  }

  if (maxViews && maxViews > 1) {
    return `Viewed (${viewTimes}/${maxViews})`;
  }

  if (viewTimes === 1) {
    return "Viewed";
  }

  return `${viewTimes} views`;
}

/**
 * Format usage count for display
 * @param limit - Usage limit
 * @returns Formatted usage string
 */
export function formatUsageCount(limit: number): string {
  return limit === 1 ? "1 use" : `${limit} uses`;
}

/**
 * Get display title for secret
 * @param message - Secret message
 * @param id - Secret ID
 * @returns Display title
 */
export function getSecretDisplayTitle(message?: string, id?: string): string {
  return message || id || "Unknown Secret";
}

/**
 * Get display title for secret request
 * @param message - Request message
 * @param id - Request ID
 * @returns Display title
 */
export function getRequestDisplayTitle(message?: string, id?: string): string {
  return message || id || "Unknown Request";
}

/**
 * Check if description should be displayed
 * @param description - Description text
 * @param message - Message text
 * @returns true if description should be shown
 */
export function shouldShowDescription(description?: string, message?: string): boolean {
  return !!(description && description !== message);
}

/**
 * Format max views for metadata display
 * @param maxViews - Maximum allowed views
 * @returns Formatted max views string or undefined
 */
export function formatMaxViewsMetadata(maxViews?: number): string | undefined {
  return maxViews && maxViews > 1 ? maxViews.toString() : undefined;
}

/**
 * Format expiration time for display
 * @param hours - Hours until expiration
 * @returns Formatted expiration string
 */
export function formatExpiration(hours: number | null | undefined): string {
  if (!hours || hours === 0) {
    return "No expiry";
  }
  return `${hours} hours`;
}

/**
 * Convert a date to hours from now
 * @param date - Date to convert
 * @returns Hours from now, or undefined if date is in the past
 */
export function dateToHoursFromNow(date: Date): number | undefined {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

  return diffHours > 0 ? diffHours : undefined;
}

/**
 * Get default expiration date (24 hours from now)
 * @returns Date object 24 hours from now
 */
export function getDefaultExpirationDate(): Date {
  const date = new Date();
  date.setHours(date.getHours() + 24);
  return date;
}
