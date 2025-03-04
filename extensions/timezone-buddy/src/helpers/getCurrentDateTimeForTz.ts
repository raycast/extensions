export function getCurrentDateTimeForTz(tz: string): string {
  const formatter = new Intl.DateTimeFormat(["en"], {
    timeZone: tz,
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });
  return formatter.format(new Date());
}
