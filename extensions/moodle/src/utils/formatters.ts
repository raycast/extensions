/**
 * Strips HTML tags and entities from Moodle HTML content for display in Raycast.
 */
export function stripHtml(html?: string): string {
  if (!html) return "";
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Formats bytes to human-readable size.
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Formats a Unix timestamp (seconds) into a readable date and time string.
 */
export function formatDateTime(timestampInSeconds: number): string {
  if (!timestampInSeconds) return "No date";
  const date = new Date(timestampInSeconds * 1000);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Returns a human-friendly relative due date string (e.g., "Due in 2 days", "Overdue by 5 hours").
 */
export function formatRelativeDueDate(timestampInSeconds: number): {
  text: string;
  isOverdue: boolean;
  isUrgent: boolean;
} {
  if (!timestampInSeconds) {
    return { text: "No deadline", isOverdue: false, isUrgent: false };
  }

  const now = Date.now();
  const target = timestampInSeconds * 1000;
  const diffMs = target - now;
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    const overdueHours = Math.abs(diffHours);
    if (overdueHours < 24) {
      return {
        text: `Overdue (${Math.max(1, Math.round(overdueHours))}h ago)`,
        isOverdue: true,
        isUrgent: true,
      };
    }
    return {
      text: `Overdue (${Math.abs(diffDays)}d ago)`,
      isOverdue: true,
      isUrgent: true,
    };
  }

  if (diffHours < 24) {
    const hoursLeft = Math.max(1, Math.round(diffHours));
    return {
      text: `Due in ${hoursLeft}h`,
      isOverdue: false,
      isUrgent: true,
    };
  }

  if (diffDays === 1) {
    return {
      text: "Due tomorrow",
      isOverdue: false,
      isUrgent: true,
    };
  }

  return {
    text: `Due in ${diffDays} days`,
    isOverdue: false,
    isUrgent: diffDays <= 3,
  };
}

/**
 * Normalizes Moodle base URL by ensuring proper protocol and removing trailing slashes.
 */
export function normalizeMoodleUrl(url: string): string {
  let trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    trimmed = `https://${trimmed}`;
  }
  return trimmed.replace(/\/+$/, "");
}
