import { cleanLineBreaks, trimEnd, trimStart } from "../types/types";
import { Cache } from "@raycast/api";
import axios from "axios";
import cheerio from "cheerio";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const getArgument = (arg: string, argKey: string) => {
  const cache = new Cache({ namespace: "Args" });
  if (typeof arg !== "undefined") {
    // call from main window
    cache.set(argKey, arg);
    return arg;
  } else {
    // call from hotkey
    const cacheStr = cache.get(argKey);
    if (typeof cacheStr !== "undefined") {
      return cacheStr;
    } else {
      return "";
    }
  }
};

export const tryTrim = (str: string | undefined): string => {
  if (!str) return "";
  let trimStr = str;
  if (trimStart) {
    trimStr = trimStr.trimStart();
  }
  if (trimEnd) {
    trimStr = trimStr.trimEnd();
  }
  return trimStr;
};

/**
 * strips all newline characters from the string and replaces them witha space.
 */
export const tryStrip = (str: string): string => {
  if (!cleanLineBreaks) {
    return str;
  }
  return str.replace(/[\r\n]/gm, " ");
};

export const transform = (str: string | undefined | null): string => {
  if (!str) return "";

  let result = str;
  result = tryTrim(result);
  result = tryStrip(result);

  return result;
};

export function extractUrl(text: string) {
  const urlRegex = /https?:\/\/[^\s]+/g;
  const matches = text.match(urlRegex);
  if (matches) {
    return matches[0];
  } else {
    return undefined;
  }
}

export function extractNumber(str: string) {
  const matches = str.match(/-?[0-9.]+/g);

  if (matches) {
    if (matches[0][0] !== "-") {
      matches[0] = matches[0].replace("-", "");
    }
    for (let i = 1; i < matches.length; i++) {
      matches[i] = matches[i].replace("-", "");
    }
    return matches.join("");
  } else {
    return undefined;
  }
}

export async function fetchTitle(url: string) {
  try {
    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);
    const title = $("title").text();
    return title;
  } catch (error) {
    console.error("Error fetching title:", error);
    return "";
  }
}
