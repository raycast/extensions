export function dailyLogDateForFileName(date: Date): string {
  return date.toISOString().split("T")[0];
}
