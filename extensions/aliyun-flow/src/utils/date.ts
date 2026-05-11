export function formatDate(date: number): string {
  return new Date(date).toLocaleString();
}

export function getDateString(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}

// format duration, s, m, h
export function formatDuration(duration: number): string {
  duration = Math.floor(duration / 1000);

  if (duration < 60) {
    return `${duration}s`;
  } else if (duration < 3600) {
    return `${Math.floor(duration / 60)}m ${duration % 60}s`;
  } else {
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m ${duration % 60}s`;
  }
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? "s" : ""} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  } else {
    return `${seconds} second${seconds > 1 ? "s" : ""} ago`;
  }
}
