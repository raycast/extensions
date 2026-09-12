export function timestampToString(timestamp: string) {
  return new Date(Number(timestamp) * 1000).toDateString();
}
