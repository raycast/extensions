import { Launch } from "./types";

/**
 * Format a date string to a more readable format
 */
export const formatLaunchDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
};

/**
 * Format a date string as relative time (e.g., "in 2 days")
 */
export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMilliseconds = date.getTime() - now.getTime();

  // Return "Now" if the launch is less than a minute away
  if (diffInMilliseconds < 60 * 1000 && diffInMilliseconds > -60 * 1000) {
    return "Now";
  }

  // If the launch has already happened
  if (diffInMilliseconds < 0) {
    const minutes = Math.floor(-diffInMilliseconds / (1000 * 60)) % 60;
    const hours = Math.floor(-diffInMilliseconds / (1000 * 60 * 60)) % 24;
    const days = Math.floor(-diffInMilliseconds / (1000 * 60 * 60 * 24));

    if (days > 0) {
      return `${days} day${days !== 1 ? "s" : ""} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    } else {
      return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    }
  }

  // If the launch is in the future
  const minutes = Math.floor(diffInMilliseconds / (1000 * 60)) % 60;
  const hours = Math.floor(diffInMilliseconds / (1000 * 60 * 60)) % 24;
  const days = Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24));

  if (days > 0) {
    return `in ${days} day${days !== 1 ? "s" : ""}`;
  } else if (hours > 0) {
    return `in ${hours} hour${hours !== 1 ? "s" : ""}`;
  } else {
    return `in ${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }
};

/**
 * Get the appropriate icon for a launch status
 */
export const getLaunchStatusIcon = (status: Launch["status"]): string => {
  switch (status.abbrev.toLowerCase()) {
    case "go":
      return "🟢";
    case "tbd":
      return "🟡";
    case "hold":
      return "🟠";
    case "in flight":
      return "🚀";
    case "success":
      return "✅";
    case "failure":
      return "❌";
    default:
      return "🔵";
  }
};
