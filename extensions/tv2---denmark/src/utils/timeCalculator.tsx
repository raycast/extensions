import { format } from "timeago.js";

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  return format(date);
}
