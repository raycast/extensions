import { utcToZonedTime } from "date-fns-tz";
import { format } from "date-fns";

// Format time for menu bar (e.g., "5p")
export function formatMenuTime(timezone?: string): string {
  const now = new Date();
  const time = timezone ? utcToZonedTime(now, timezone) : now;
  const hour = format(time, "h");
  const ampm = format(time, "a").toLowerCase().charAt(0);
  return `${hour}${ampm}`;
}

// Format time for dropdown (e.g., "5:30 PM")
export function formatDropdownTime(timezone?: string): string {
  const now = new Date();
  const time = timezone ? utcToZonedTime(now, timezone) : now;
  return format(time, "h:mm a");
}

// Get timezone abbreviation (e.g., "EST", "PST")
export function getTimezoneCode(timezone?: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "short",
  });
  const parts = formatter.formatToParts(now);
  const timeZonePart = parts.find((part) => part.type === "timeZoneName");
  return timeZonePart?.value || "";
}

// Format time for preview (e.g., "5:30 PM")
export function formatPreviewTime(timezone: string): string {
  const now = new Date();
  const zonedTime = utcToZonedTime(now, timezone);
  return format(zonedTime, "h:mm a");
}
