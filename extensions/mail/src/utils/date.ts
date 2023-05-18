import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

export const constructDate = (date: string): Date => {
  return new Date(date.replaceAll(",", "").replaceAll("at", ""));
};

export const toRelative = (input: Date | string): string => {
  const date = typeof input === "string" ? constructDate(input) : input;
  return timeAgo.format(date) as string;
};
