import { Icon } from "@raycast/api"; 
import { Account, Message } from "../types/types";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";
import * as cleanTextUtils from "clean-text-utils";
import json2md from "json2md";
import mime from "mime-types";

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

export const getMIMEtype = (extension: string | undefined): string | undefined => {
  if (!extension) return undefined;
  const mimeType: string | false = mime.lookup(extension);
  if (mimeType) return mimeType.split("/")[0];
  else return undefined; 
}

export const getAttachmentIcon = (type: string | undefined): string | Icon => {
  if (type) {
    switch (type) {
      case "image":
        return Icon.Image;
      case "video":
        return Icon.Video;
      case "audio":
        return Icon.SpeakerOn;
      case "text":
      case "application":
        return Icon.Document;
      default:
        return Icon.Paperclip;
    }
  } else { 
    return Icon.Paperclip;
  }
};

export const formatFileSize = (size: string): string => {
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  let i = parseInt(size);
  if (i < 0) return "0";
  let j = 0;
  while (i > 1024) {
    i /= 1024;
    j++;
  }
  return i.toFixed(1) + " " + sizes[j];
}