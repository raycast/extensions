export function secondsToUptime(seconds: number): string {
  if (seconds >= 86400) {
    return `${Math.floor(seconds / 86400)}d`;
  }
  if (seconds >= 3600) {
    return `${Math.floor(seconds / 3600)}h`;
  }
  if (seconds >= 60) {
    return `${Math.floor(seconds / 60)}m`;
  }
  return `${seconds}s`;
}
