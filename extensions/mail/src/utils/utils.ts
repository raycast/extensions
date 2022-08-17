import { Account, Message } from "../types/types";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

export const formatDate = (input: Date | string): string => {
  const date = typeof input === "string" ? new Date(input.replaceAll(",", "").replaceAll("at", "")) : input;
  return timeAgo.format(date) as string;
};

export const shortenText = (text: string, maxLength: number): string => {
  if (text.length > maxLength) {
    return text.substring(0, maxLength) + "...";
  }
  return text;
};
