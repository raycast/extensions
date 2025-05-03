import { cleanLineBreaks, showTips, trimEnd, trimStart } from "../types/types";
import { Cache, showHUD, showToast, Toast } from "@raycast/api";
import axios from "axios";
import { load } from "cheerio";

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

export function extractNumber(input: string): string {
  const match = input.match(/-?[\d,]+(?:\.\d+)?\b/);
  if (match) {
    return match[0].replace(/,/g, "");
  }
  return "";
}

export async function fetchTitle(url: string) {
  try {
    const response = await axios.get(url);
    const html = response.data;
    const $ = load(html);
    return $("title").text();
  } catch (error) {
    console.error("Error fetching title:", error);
    return "";
  }
}

export const showCustomHUD = (options: Toast.Options) => {
  if (options.style && options.style === Toast.Style.Failure) {
    // failure should always show toast
    return showToast(options);
  } else if (showTips) {
    // success or animated should show HUD
    if (options.style && options.style === Toast.Style.Animated) {
      return showToast(options);
    } else {
      return showHUD(options.title);
    }
  }
};
