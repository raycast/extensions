import { getAvatarIcon } from "@raycast/utils";
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

function uvIndexColor(index: number) {
  if (Number.isNaN(index)) {
    return "#4EA12D";
  }
  if (index >= 11) {
    return "#C12BF6"; //extreme
  }
  if (index >= 8) {
    return "#E93323"; // very high
  }
  if (index >= 6) {
    return "#EE7F31"; // high
  }
  if (index >= 3) {
    return "#F5BE41"; // middle
  }
  return "#4EA12D"; // low
}

export function getUVIndexIcon(uvIndex: string | undefined) {
  if (!uvIndex || uvIndex.trim().length <= 0) {
    return;
  }
  const index = Number(uvIndex);
  const color = uvIndexColor(index);
  return getAvatarIcon(uvIndex, { background: color });
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
