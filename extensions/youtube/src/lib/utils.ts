import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";
import { v4 as uuidv4 } from "uuid";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === "string") {
    return error;
  } else {
    return "unknown error";
  }
}

const fmt = new Intl.NumberFormat("en", { notation: "compact" });

export function compactNumberFormat(num: number): string {
  return fmt.format(num);
}

export function formatDateShort(input: Date | string) {
  const date = typeof input === "string" ? new Date(input) : input;
  return timeAgo.format(date, "twitter") as string;
}

export function formatDate(input: Date | string) {
  const date = typeof input === "string" ? new Date(input) : input;
  return timeAgo.format(date) as string;
}

export function getUuid(): string {
  return uuidv4();
}
