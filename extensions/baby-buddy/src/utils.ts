import { differenceInSeconds, formatDistanceToNow, parseISO } from "date-fns";

export function formatTimeAgo(dateString: string | undefined): string {
  if (!dateString) return "Unknown";
  try {
    const date = parseISO(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error("Error parsing date:", error);
    return "Invalid date";
  }
}

export function formatFullTime(dateString: string | undefined): string {
  if (!dateString) return "Unknown";
  try {
    const date = parseISO(dateString);
    // Format without leading zeros and with seconds
    const hours = date.getHours() % 12 || 12; // Convert 0 to 12 for 12-hour format
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const ampm = date.getHours() >= 12 ? "PM" : "AM";
    const month = date.getMonth() + 1; // getMonth() is zero-based
    const day = date.getDate();
    const year = date.getFullYear();

    return `${month}/${day}/${year} ${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")} ${ampm}`;
  } catch (error) {
    console.error("Error formatting full time:", error);
    return "Invalid date";
  }
}

export function formatTimeWithTooltip(dateString: string | undefined): { text: string; tooltip: string } {
  return {
    text: formatTimeAgo(dateString),
    tooltip: formatFullTime(dateString),
  };
}

export function formatDuration(durationString: string | undefined): string {
  if (!durationString) return "Unknown";

  // Baby Buddy durations are in format "HH:MM:SS"
  const parts = durationString.split(":");
  if (parts.length !== 3) return durationString;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

export function getDiaperDescription(wet: boolean, solid: boolean): string {
  if (wet && solid) return "wet and solid";
  if (wet) return "wet";
  if (solid) return "solid";
  return "";
}

export function calculateElapsedTime(startTimeString: string): string {
  try {
    const startTime = parseISO(startTimeString);
    const now = new Date();
    const seconds = differenceInSeconds(now, startTime);

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  } catch (error) {
    console.error("Error calculating elapsed time:", error);
    return "Unknown";
  }
}
