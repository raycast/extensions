/**
 * Get the UTC offset for a timezone in the format like "+01:00" or "-05:00"
 * @param tz - IANA timezone identifier (e.g., "Europe/Brussels")
 * @param format - The format to use ("UTC" or "GMT")
 * @returns Formatted offset string like "UTC+01:00" or "GMT-05:00"
 */
export function getTimezoneOffset(tz: string, format: "UTC" | "GMT" = "UTC"): string {
  const now = new Date();

  // Get the offset in minutes
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "longOffset",
  });

  const parts = formatter.formatToParts(now);
  const offsetPart = parts.find((part) => part.type === "timeZoneName");

  if (offsetPart && offsetPart.value.startsWith("GMT")) {
    // Extract the offset (e.g., "GMT+1" or "GMT+01:00")
    const offset = offsetPart.value.replace("GMT", "");

    // Normalize to always show hours and minutes (e.g., "+01:00")
    if (offset === "") {
      return `${format}+00:00`;
    }

    // If offset is already in format like "+01:00" or "-05:00"
    if (offset.includes(":")) {
      return `${format}${offset}`;
    }

    // If offset is like "+1" or "-5", convert to "+01:00" or "-05:00"
    const sign = offset[0];
    const hours = parseInt(offset.slice(1));
    return `${format}${sign}${String(hours).padStart(2, "0")}:00`;
  }

  // Fallback method using UTC offset calculation
  const utcDate = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(now.toLocaleString("en-US", { timeZone: tz }));
  const offsetMinutes = (tzDate.getTime() - utcDate.getTime()) / (1000 * 60);

  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;

  return `${format}${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
