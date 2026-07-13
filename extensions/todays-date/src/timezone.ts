// Returns the zone's UTC offset in minutes at the given instant (DST-aware).
export function getZoneOffsetMinutes(now: Date, timeZone: string): number {
  const offset =
    new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
      .formatToParts(now)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(offset);
  return match ? (match[1] === "-" ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3])) : 0;
}
