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
