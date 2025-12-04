import { URL } from "url";

export const capitalize = (string: string) => string[0].toUpperCase().concat(string.slice(1));

export const humanize = (string: string) => (string === "url" ? string.toUpperCase() : capitalize(string));

export const isDirectory = (string: string) => string.endsWith("/");

export const sortDirectoriesFirst = (array: string[]) =>
  array.sort((a, b) => (isDirectory(a) && !isDirectory(b) ? -1 : 0));

export const isValidUrl = (string: string) => {
  try {
    return /^http[s]?:/.test(new URL(string).protocol);
  } catch (err) {
    return false;
  }
};
