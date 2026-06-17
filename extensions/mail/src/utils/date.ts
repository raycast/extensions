import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

export const isValidDate = (input: Date | string) => {
  const date = typeof input === "string" ? constructDate(input) : input;
  return date !== null && date !== undefined && !isNaN(date?.getTime?.());
};

export const constructDate = (date: string) => {
  return new Date(date.replaceAll(",", "").replaceAll("at", ""));
};

export const toRelative = (input: Date | string) => {
  const date = typeof input === "string" ? constructDate(input) : input;
  return timeAgo.format(date) as string;
};
