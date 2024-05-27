export function getCurrentTimeForTz(tz: string): string {
  const formatter = new Intl.DateTimeFormat([], {
    timeZone: tz,
    hour: "numeric",
    minute: "numeric",
  });
  return formatter.format(new Date());
}
