export function toLocalTime(timestamp: number | string | Date) {
  return new Date(timestamp).toLocaleString();
}
