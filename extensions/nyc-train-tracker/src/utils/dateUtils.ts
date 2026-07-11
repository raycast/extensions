import { formatDistanceToNow, format } from "date-fns";
import { ProcessedDeparture } from "../types";

// Helper function still expects a Date object, now allows null
export function formatDepartureTime(time: Date | null): string {
  if (!time) return "N/A"; // Handle null time
  const now = new Date();
  const diffMinutes = (time.getTime() - now.getTime()) / 60000;
  const timeString = format(time, "h:mm a");

  if (diffMinutes < 1) return `${timeString} (Due)`;
  if (diffMinutes <= 60) return `${timeString} (in ${formatDistanceToNow(time, { addSuffix: false })})`;
  return timeString;
}

// Helper for Copy Action (uses ProcessedDeparture)
export const getCopyContent = (dep: ProcessedDeparture): string => {
  const timeString = dep.departureTime ? format(dep.departureTime, "h:mm a") : "N/A";
  const trackString = dep.track ? ` from Track ${dep.track}` : "";
  const routeName = dep.routeLongName || dep.routeShortName;
  const routeString = routeName ? ` (${routeName})` : "";
  return `Train to ${dep.destination}${routeString} departing ${timeString}${trackString}. Status: ${dep.status}`;
};
