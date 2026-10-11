import { homedir } from "node:os";
import { basename, dirname } from "node:path";

const HOME = homedir();

/** `/Users/me/Developer` → `~/Developer`. */
export function tildify(path: string) {
  if (path === HOME) return "~";
  return path.startsWith(HOME + "/") ? "~" + path.slice(HOME.length) : path;
}

export function fileName(path: string) {
  return basename(path) || path;
}

export function folderOf(path: string) {
  return tildify(dirname(path));
}

const BYTES = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const UNITS = ["bytes", "KB", "MB", "GB", "TB"];

/** Finder-style sizes: decimal units, one decimal place. */
export function formatSize(bytes: number) {
  if (bytes < 1000) return bytes === 1 ? "1 byte" : `${bytes} bytes`;
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < UNITS.length - 1) {
    value /= 1000;
    unit++;
  }
  return `${BYTES.format(value)} ${UNITS[unit]}`;
}

const DATE = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

export function formatDate(date: Date) {
  return DATE.format(date);
}

export function modifiedDate(mtime: number) {
  return mtime > 0 ? new Date(mtime * 1000) : undefined;
}

export function pluralize(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}

/** A path as a URL path, with every segment escaped so `#`, `?`, and `%` stay part of the name. */
export function encodePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}
