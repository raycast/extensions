export function formatRelativeDateTime(value: string | null): string {
  if (!value) {
    return "Unknown time";
  }

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return "Just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleString();
}

export function formatDuration(startedAt: string | null, updatedAt: string): string {
  if (!startedAt) {
    return formatRelativeDateTime(updatedAt);
  }

  const start = new Date(startedAt).getTime();
  const end = new Date(updatedAt).getTime();
  const durationMs = Math.max(0, end - start);
  const minutes = Math.floor(durationMs / 60000);

  if (minutes < 1) {
    return "<1m";
  }

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}
