/** v1 returns ASP.NET dates - `/Date(1740067200000+0000)/` - which `new Date()` reads as Invalid Date. */
const ASP_NET_DATE = /^\/Date\((-?\d+)([+-]\d{4})?\)\/$/;

/** The offset is ignored: the milliseconds are already absolute. */
export function parseApiDate(value: string | null | undefined): Date | null {
  if (!value) return null;

  const aspNet = ASP_NET_DATE.exec(value);
  if (aspNet?.[1]) {
    const date = new Date(Number(aspNet[1]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Undated items sort last rather than first. */
export function sortableTime(value: string | null | undefined): number {
  return parseApiDate(value)?.getTime() ?? Number.NEGATIVE_INFINITY;
}
