export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  const displaySeconds = seconds % 60;
  const displayMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${displayMinutes}m ${displaySeconds}s`;
  }
  if (minutes > 0) {
    return `${displayMinutes}m ${displaySeconds}s`;
  }
  return `${displaySeconds}s`;
}

export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString(undefined, {
    // Use system locale
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function getElapsedTime(startTimeIso: string): number {
  const startTime = new Date(startTimeIso).getTime();
  return Date.now() - startTime;
}

/**
 * Format a date relative to today for upcoming events display.
 * Returns: "Today 10:00", "Tomorrow 14:30", "Mon 09:00", "Feb 25 10:00"
 */
export function formatRelativeDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const time = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  if (diffDays === 0) return `Today ${time}`;
  if (diffDays === 1) return `Tomorrow ${time}`;
  if (diffDays === -1) return `Yesterday ${time}`;

  if (diffDays > 1 && diffDays <= 6) {
    const dayName = date.toLocaleDateString(undefined, {
      weekday: "short",
    });
    return `${dayName} ${time}`;
  }

  // For dates further away or in the past
  const dateStr = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return `${dateStr} ${time}`;
}
