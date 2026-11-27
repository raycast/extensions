export function formatDuration(seconds: number): string {
  if (seconds <= 0) {
    return "Indefinitely";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(hours === 1 ? "1 hour" : `${hours} hours`);
  }
  if (minutes > 0) {
    parts.push(minutes === 1 ? "1 minute" : `${minutes} minutes`);
  }
  if (remainingSeconds > 0 && hours === 0) {
    parts.push(remainingSeconds === 1 ? "1 second" : `${remainingSeconds} seconds`);
  }

  return parts.length > 0 ? parts.join(" ") : `${seconds} seconds`;
}

export function formatRemainingTime(expiresAt: number | null | undefined): string {
  if (expiresAt === null || expiresAt === undefined) {
    return "Indefinite";
  }

  const now = Date.now();
  const diffMs = expiresAt - now;

  if (diffMs <= 0) {
    return "Expiring now";
  }

  const totalSeconds = Math.ceil(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m remaining` : `${hours}h remaining`;
  }
  if (minutes > 0) {
    return seconds > 0 ? `${minutes}m ${seconds}s remaining` : `${minutes}m remaining`;
  }
  return `${seconds}s remaining`;
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
}
