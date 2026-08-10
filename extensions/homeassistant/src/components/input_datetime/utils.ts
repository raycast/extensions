export function unixTimestampToDate(timestamp: number): Date {
  return new Date(timestamp * 1000);
}

export function dateToUnixTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}
