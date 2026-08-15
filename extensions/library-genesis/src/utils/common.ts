import { homedir } from "node:os";
import { join } from "node:path";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

export const parseLowerCaseArray = (string: string) => {
  return string
    .toLowerCase()
    .split(",")
    .map((item) => item.trim());
};

// https://stackoverflow.com/questions/10003683/how-can-i-extract-a-number-from-a-string-in-javascript
export const extractNumber = (string: string, index = 0) => {
  const numbers = string.match(/\d+/);
  return numbers ? numbers[index] : string; // replace all leading non-digits with nothing
};

export const resolveHome = (filepath: string) => {
  if (filepath[0] === "~") {
    return join(homedir(), filepath.slice(1));
  }
  return filepath;
};
