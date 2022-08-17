import { Account, Message } from "../types/types";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

export const constructDate = (date: string): Date => {
  return new Date(date.replaceAll(",", "").replaceAll("at", ""));
};

export const formatDate = (input: Date | string): string => {
  const date = typeof input === "string" ? constructDate(input) : input;
  return timeAgo.format(date) as string;
};

export const shortenText = (text: string, maxLength: number): string => {
  let length = text.split("").map((c: string) => (c == c.toUpperCase() ? 1.2 : 1)).reduce((a: number, b: number) => a + b, 0);
  if (length > maxLength) {
    let shortened = "";
    length = 0; 
    for (const c of text) {
      shortened += c; 
      length += c == c.toUpperCase() ? 1.2 : 1;
      if (length > maxLength) break; 
    }
    return shortened + "...";
  }
  return text;
};
