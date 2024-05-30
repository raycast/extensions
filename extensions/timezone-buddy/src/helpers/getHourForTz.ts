export function getHourForTz(tz: string): number {
  const formatter = new Intl.DateTimeFormat(["en-GB"], {
    timeZone: tz,
    hour: "numeric",
    hour12: false,
  });

  return Number(formatter.format(new Date()));
}
