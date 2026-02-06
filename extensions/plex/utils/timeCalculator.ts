import { formatDuration, intervalToDuration } from "date-fns";

export function calculateTime(ms: number): string {
  const duration = intervalToDuration({ start: 0, end: ms });
  return formatDuration(duration, { format: ["hours", "minutes"] });
}
