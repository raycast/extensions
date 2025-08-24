import { CPANEL_URL } from "./constants";

export function isInvalidUrl() {
  try {
    new URL(CPANEL_URL);
    return false;
  } catch {
    return true;
  }
}

export function formatDate(date: Date) {
  return date.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}
