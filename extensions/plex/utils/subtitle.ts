import { formatDistanceToNow } from "date-fns";
import { Metadata } from "../types/types";
import { calculateTime } from "./timeCalculator";

export function getSubtitle(item: Metadata, sort: string): string {
  const parts: string[] = [];
  if (item.year) parts.push(item.year.toString());

  if (sort.startsWith("rating") && item.rating) {
    parts.push(`⭐ ${item.rating}`);
  } else if (sort.startsWith("audienceRating") && item.audienceRating) {
    parts.push(`🍿 ${item.audienceRating}`);
  } else if (sort.startsWith("duration") && item.duration) {
    parts.push(`⌛ ${calculateTime(item.duration)}`);
  } else if (sort.startsWith("lastViewedAt")) {
    if (item.lastViewedAt) {
      parts.push(formatDistanceToNow(new Date(item.lastViewedAt * 1000), { addSuffix: true }));
    } else {
      parts.push("Unwatched");
    }
  } else if (item.viewOffset) {
    parts.push("In Progress");
  } else if (item.viewCount) {
    parts.push("Watched");
  }

  return parts.join(" · ");
}
