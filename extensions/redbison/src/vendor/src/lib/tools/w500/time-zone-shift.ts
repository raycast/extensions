/**
 * The wall-clock time an instant falls on in another zone.
 *
 * Intl carries the IANA database, including the historical offsets and the
 * daylight-saving rules, so there is no table to keep here and nothing to go
 * stale between releases. en-CA is asked for because it formats as
 * year-month-day, which is then reassembled rather than trusted as a string.
 */
export class TimeZoneError extends Error {}

export function formatInZone(date: Date, timeZone: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
}

export type ZoneConversion = { utc: string; zone: string; local: string };

export function convertZone(timestamp: string, zone: string): ZoneConversion {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) throw new TimeZoneError('Invalid timestamp');
  // Formatting is also how an unknown zone is caught: Intl throws for one it
  // does not know, which is a better check than a list we would have to keep.
  const local = formatInZone(d, zone);
  return { utc: d.toISOString(), zone, local };
}
