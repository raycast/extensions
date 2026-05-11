import { Timestamp } from "../api/types";

/**
 * Format timestamp from API response to readable date string
 * @param timestamp - Timestamp object with seconds and nanos
 * @returns Formatted date string or "Unknown" if timestamp is null
 */
export function formatDate(timestamp: Timestamp | null): string {
  if (!timestamp || !timestamp.seconds) {
    return "Unknown";
  }

  try {
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString();
  } catch (error) {
    console.warn("Failed to format date:", error);
    return "Invalid date";
  }
}

/**
 * Format timestamp to detailed date and time string
 * @param timestamp - Timestamp object with seconds and nanos
 * @returns Formatted date and time string
 */
export function formatDateTime(timestamp: Timestamp | null): string {
  if (!timestamp || !timestamp.seconds) {
    return "Unknown";
  }

  try {
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString();
  } catch (error) {
    console.warn("Failed to format date time:", error);
    return "Invalid date";
  }
}

/**
 * Format timestamp to relative time string (e.g., "2 hours ago")
 * @param timestamp - Timestamp object with seconds and nanos
 * @returns Relative time string
 */
export function formatRelativeTime(timestamp: Timestamp | null): string {
  if (!timestamp || !timestamp.seconds) {
    return "Unknown";
  }

  try {
    const date = new Date(timestamp.seconds * 1000);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return "Just now";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? "s" : ""} ago`;
    } else {
      return formatDate(timestamp);
    }
  } catch (error) {
    console.warn("Failed to format relative time:", error);
    return "Invalid date";
  }
}
