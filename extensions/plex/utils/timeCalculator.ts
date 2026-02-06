import { formatDuration, intervalToDuration } from "date-fns";

/** Formats a duration in milliseconds (as returned by Plex API) to a human-readable string. */
export function calculateTime(ms: number): string {
  const duration = intervalToDuration({ start: 0, end: ms });
  return formatDuration(duration, { format: ["hours", "minutes"] });
}
