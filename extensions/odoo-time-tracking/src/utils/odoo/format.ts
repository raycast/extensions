/**
 * Formatting utilities for dates, times, and durations
 */

/**
 * Format a duration in seconds to human-readable format (e.g., "2h 30min 15sec")
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours === 0 && minutes === 0 && secs === 0) {
    return "0sec";
  }

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}min`);
  }
  if (secs > 0 || (hours === 0 && minutes === 0)) {
    parts.push(`${secs}sec`);
  }

  return parts.join(" ");
}

/**
 * Format hours (decimal) to human-readable format (e.g., 2.5 -> "2h 30min")
 */
export function formatHours(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h === 0 && m === 0) {
    return "0min";
  }

  const parts: string[] = [];
  if (h > 0) {
    parts.push(`${h}h`);
  }
  if (m > 0) {
    parts.push(`${m}min`);
  }

  return parts.join(" ");
}

/**
 * Calculate elapsed time from start time to server time in seconds
 * Both timestamps are in Odoo format "YYYY-MM-DD HH:MM:SS"
 */
export function getElapsedSeconds(startTime: string, serverTime: string): number {
  // Both timestamps are from Odoo in "YYYY-MM-DD HH:MM:SS" format
  // Convert to Date objects for comparison
  const start = new Date(startTime.replace(" ", "T"));
  const now = new Date(serverTime.replace(" ", "T"));
  const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000);
  console.log("[Format] Calculating elapsed - Start:", startTime, "Server:", serverTime, "Elapsed:", elapsed);
  return elapsed;
}

/**
 * Format an ISO datetime string to local time (e.g., "2:30 PM")
 */
export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * Format an ISO datetime string to local date and time (e.g., "Jan 26, 2:30 PM")
 */
export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Format an ISO datetime string to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "just now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  } else {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }
}

/**
 * Truncate a string to a maximum length with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - 1) + "\u2026";
}

/**
 * Format project and task name for menu bar (truncate if too long)
 */
export function formatMenuBarTitle(projectName: string, taskName: string, maxLength = 20): string {
  const combined = `${projectName} - ${taskName}`;
  return truncate(combined, maxLength);
}
