export function formatSeconds(total: number): string {
  const seconds = Math.max(0, Math.round(total));
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}

export function secondsBetween(start?: string | null, end?: string | Date | null): number | undefined {
  if (!start) {
    return undefined;
  }
  const endTime = end instanceof Date ? end.getTime() : end ? Date.parse(end) : Date.now();
  const startTime = Date.parse(start);
  if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
    return undefined;
  }
  return Math.max(0, (endTime - startTime) / 1000);
}

export function formatAgo(iso: string, now = new Date()): string {
  const seconds = secondsBetween(iso, now);
  if (seconds === undefined) {
    return "";
  }
  if (seconds < 60) {
    return "just now";
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function ordinal(value: number): string {
  const tens = value % 100;
  if (tens >= 11 && tens <= 13) {
    return `${value}th`;
  }
  const suffix = ["th", "st", "nd", "rd"][value % 10] ?? "th";
  return `${value}${suffix}`;
}
