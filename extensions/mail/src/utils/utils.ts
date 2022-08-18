import { Account, Message } from "../types/types";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";
import * as cleanTextUtils from "clean-text-utils";
import json2md from "json2md";

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
  let length = text
    .split("")
    .map((c: string) => (c == c.toUpperCase() ? 1.2 : 1))
    .reduce((a: number, b: number) => a + b, 0);
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

const titleCase = (str: string): string => {
  str = str
    .toLowerCase()
    .split(" ")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
  return str.trim();
};

export const formatMarkdown = (title: string, text: string): string => {
  title = titleCase(title);
  text = cleanTextUtils.strip.nonASCII(text);
  text = cleanTextUtils.replace.diacritics(text);
  text = cleanTextUtils.replace.exoticChars(text);
  text = cleanTextUtils.replace.smartChars(text);
  text = text.trim().replaceAll(/[ ][ ]+/g, " "); 
  return json2md([{ h1: title }, { p: text }]);
};
