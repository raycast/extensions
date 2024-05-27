import { cleanLineBreaks, trimEnd, trimStart } from "./types";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
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
  const regex = /-?\d+(\.\d+)?/g;
  const numbers = str.match(regex);
  if (numbers) {
    return numbers.map(Number)[0];
  } else {
    return undefined;
  }
}
