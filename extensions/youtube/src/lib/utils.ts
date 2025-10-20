import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

export function getErrorMessage(error: unknown): string {
  let message: string;

  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "string") {
    message = error;
  } else {
    return "unknown error";
  }

  // Remove HTML tags from error messages
  return message.replace(/<[^>]*>/g, "");
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
