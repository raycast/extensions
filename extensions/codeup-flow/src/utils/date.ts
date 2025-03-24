export function formatDate(date: number): string {
  return new Date(date).toLocaleString("zh-CN");
}

export function getDateString(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("zh-CN");
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
