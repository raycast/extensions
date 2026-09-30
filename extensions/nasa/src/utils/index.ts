import { format } from "timeago.js";

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  return format(date);
}

export function calculateTimeInSpace(duration: string): string {
  const regex = /P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = duration.match(regex);

  if (!matches) {
    throw new Error("Invalid duration format");
  }

  const days = parseInt(matches[1] || "0", 10);
  const hours = parseInt(matches[2] || "0", 10);
  const minutes = parseInt(matches[3] || "0", 10);
  const seconds = parseInt(matches[4] || "0", 10);

  return days + " days, " + hours + " hours, " + minutes + " minutes, " + seconds + " seconds";
}
