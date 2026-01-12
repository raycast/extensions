/**
 * Format the current time in a specific timezone
 * @param ianaTimezone - IANA timezone identifier (e.g., "America/New_York")
 * @returns Formatted time string like "2:30 PM EST (Eastern Time)"
 */
export function formatTimeInZone(ianaTimezone: string): string {
  const now = new Date();

  // Get time with short timezone abbreviation (e.g., "2:30 PM EST")
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: ianaTimezone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  // Get the full timezone name (e.g., "Eastern Standard Time")
  const fullNameFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: ianaTimezone,
    timeZoneName: "long",
  });

  const timePart = timeFormatter.format(now);

  // Extract just the timezone name from the full formatter
  const fullParts = fullNameFormatter.formatToParts(now);
  const fullTimezoneName =
    fullParts.find((p) => p.type === "timeZoneName")?.value || "";

  // Simplify the full name (remove "Standard" or "Daylight" for cleaner display)
  const simplifiedName = fullTimezoneName
    .replace(" Standard Time", " Time")
    .replace(" Daylight Time", " Time");

  return `${timePart} (${simplifiedName})`;
}

/**
 * Get just the timezone abbreviation
 * @param ianaTimezone - IANA timezone identifier
 * @returns Timezone abbreviation like "EST" or "PST"
 */
export function getTimezoneAbbreviation(ianaTimezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: ianaTimezone,
    timeZoneName: "short",
  });

  const parts = formatter.formatToParts(new Date());
  return parts.find((p) => p.type === "timeZoneName")?.value || "";
}
