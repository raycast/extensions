export function getDurationSeconds(startedAt: string | Date, endedAt: string | Date): number {
  const startMs = toMilliseconds(startedAt);
  const endMs = toMilliseconds(endedAt);

  if (endMs < startMs) {
    throw new Error("End time must be after start time");
  }

  return Math.floor((endMs - startMs) / 1000);
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "-";
  }

  if (seconds > 0 && seconds < 60) {
    return "<1m";
  }

  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function toMilliseconds(value: string | Date): number {
  const milliseconds = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (!Number.isFinite(milliseconds)) {
    throw new Error("Invalid date");
  }
  return milliseconds;
}
