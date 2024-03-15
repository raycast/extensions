import { getPreferenceValues } from "@raycast/api";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.startsWith("Error: ")) {
      const [_, m] = msg.split("Error: ");
      return m;
    }
    return msg;
  } else {
    return "Unknown Error";
  }
}

export function isDateValid(date: Date) {
  return !Number.isNaN(date.getTime());
}

export function convertToRelativeDate(input: Date | string | undefined): string | undefined {
  if (!input) {
    return;
  }
  const date = typeof input === "string" ? new Date(input) : input;
  if (!isDateValid(date)) {
    return;
  }
  return timeAgo.format(date) as string;
}

export function clockFormat(): "24h" | "12h" {
  const prefs = getPreferenceValues();
  const f = prefs.clockformat as string | undefined;
  if (f === "12h" || f === "24h") {
    return f;
  }
  return "24h";
}
