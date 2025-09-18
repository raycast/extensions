import { Clipboard, Image, LocalStorage, showToast, Toast } from "@raycast/api";
import { Project } from "./gitlabapi";
import { getSVGText, GitLabIcons } from "./icons";
import * as fs from "fs/promises";
import * as fsSync from "fs";
import { constants } from "fs";
import * as crypto from "crypto";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";
import urljoin from "url-join";
import { emojiSymbol } from "./components/status/utils";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

export function projectIconUrl(project: Project): string | undefined {
  let result: string | undefined;
  // TODO check also namespace for icon
  if (project.avatar_url) {
    result = project.avatar_url;
  } else if (project.owner && project.owner.avatar_url) {
    result = project.owner.avatar_url;
  }
  return result;
}

export function getFirstChar(text: string): string {
  const firstChar = text.codePointAt(0);

  return firstChar ? String.fromCodePoint(firstChar) : "";
}

export function projectIcon(project: Project): Image.ImageLike {
  const svgSource = () => {
    return getSVGText(getFirstChar(project.name)) || GitLabIcons.project;
  };
  let result: string = GitLabIcons.project;
  // TODO check also namespace for icon
  if (project.avatar_url) {
    result = project.avatar_url;
  } else if (project.owner && project.owner.avatar_url) {
    result = project.owner.avatar_url;
  } else {
    result = svgSource();
  }
  return { source: result, mask: Image.Mask.Circle, fallback: svgSource() };
}

export function toDateString(d: string): string {
  const date = new Date(d);
  const mo = new Intl.DateTimeFormat("en", { month: "short" }).format(date);
  const da = new Intl.DateTimeFormat("en", { day: "2-digit" }).format(date);
  return `${da}. ${mo}`;
}

export function toLongDateString(d: string) {
  const date = new Date(d);
  return date.toLocaleDateString();
}

export function getIdFromGqlId(id: string): number {
  const splits = id.split("/");
  return parseInt(splits.pop() || "");
}

export function currentSeconds(): number {
  return Date.now() / 1000;
}

export async function getCacheObject<T>(key: string, seconds: number): Promise<T | undefined> {
  console.log(`get cache object ${key} from store`);
  const cache = await LocalStorage.getItem(key);
  console.log("after local storage");
  console.log(cache);
  if (cache) {
    const cache_data = JSON.parse(cache.toString());
    const timestamp = currentSeconds();
    const delta = timestamp - cache_data.timestamp;
    if (delta > seconds) {
      return undefined;
    } else {
      return cache_data.payload;
    }
  }
  return undefined;
}

export async function setCacheObject<T>(key: string, payload: T): Promise<void> {
  const cache_data = {
    timestamp: currentSeconds(),
    payload: payload,
  };
  console.log(key);
  console.log(cache_data);
  const text = JSON.stringify(cache_data);
  console.log(text.length);
  await LocalStorage.setItem(key, text);
}

export async function fileExists(filename: string): Promise<boolean> {
  return fs
    .access(filename, constants.F_OK | constants.W_OK | constants.R_OK)
    .then(() => true)
    .catch(() => false);
}

export function fileExistsSync(filename: string): boolean {
  try {
    fsSync.accessSync(filename, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export function replaceAll(str: string, find: RegExp, replace: string): string {
  return str.replace(find, replace);
}

export function optimizeMarkdownText(text: string, baseUrl?: string): string {
  let result = text;
  // remove html comments
  result = replaceAll(result, /<!--[\s\S]*?-->/g, "");

  // remove cc
  result = replaceAll(result, /^\/cc.*/gm, "");

  // <br> to markdown new line
  result = replaceAll(result, /<br>/g, "  \n");

  // replace all emojis
  result = result.replace(/:(\w+):/g, (original, emoji) => emojiSymbol(emoji) ?? original);

  // remove inline HTML tags
  result = replaceAll(result, /<[^>]+>/g, "");

  if (baseUrl) {
    // replace relative links with absolute ones
    try {
      const regexMdLinks = /\[([^[]+)\](\(.*\))/gm;
      const matches = result.match(regexMdLinks);
      if (matches) {
        const singleMatch = /\[([^[]+)\]\((.*)\)/;
        for (let i = 0; i < matches.length; i++) {
          const text = singleMatch.exec(matches[i]);
          if (text) {
            const word = text[1];
            const link = text[2].trim();
            if (link.startsWith("/")) {
              const fullUrl = urljoin(baseUrl, link);
              const mdUrl = `[${word}](${fullUrl})`;
              result = result.replace(text[0], mdUrl);
            }
          }
        }
      }
    } catch {
      // Do nothing
    }
  }

  return result;
}

export function hashString(text: string): string {
  const sha256 = crypto.createHash("sha256");
  sha256.update(text);
  return sha256.digest("hex");
}

export function hashRecord(rec: Record<string, unknown>, prefix?: string | undefined): string {
  const sha256 = crypto.createHash("sha256");
  Object.entries(rec)
    .sort()
    .forEach(([k, v]) => {
      sha256.update(`${k}${v}`);
    });
  const h = sha256.digest("hex");
  if (prefix) {
    return `${prefix}_${h}`;
  } else {
    return h;
  }
}

export function capitalizeFirstLetter(name: string): string {
  if (!name || name.length <= 0) {
    return name;
  }
  return name.replace(/^./, name[0].toUpperCase());
}

export function toFormValues(values: Record<string, unknown>): Record<string, string> {
  const val: Record<string, string> = {};
  for (const [k, v] of Object.entries(values)) {
    if (v) {
      if (Array.isArray(v)) {
        if (v.length > 0) {
          val[k] = v.join(",");
        } else {
          continue;
        }
      } else {
        val[k] = String(v);
      }
    }
  }
  return val;
}

export function stringToSlug(str: string): string {
  str = str.replace(/^\s+|\s+$/g, ""); // trim
  str = str.toLowerCase();

  // remove accents, swap ñ for n, etc
  const from = "åàáãäâèéëêìíïîòóöôùúüûñç·/_,:;";
  const to = "aaaaaaeeeeiiiioooouuuunc------";

  for (let i = 0, l = from.length; i < l; i++) {
    str = str.replace(new RegExp(from.charAt(i), "g"), to.charAt(i));
  }

  str = str
    .replace(/[^a-z0-9 -]/g, "") // remove invalid chars
    .replace(/\s+/g, "-") // collapse whitespace and replace by -
    .replace(/-+/g, "-"); // collapse dashes

  return str;
}

export class Query {
  query: string | undefined;
  named: Record<string, string[]> = {};
  negativeNamed: Record<string, string[]> = {};
}

export function tokenizeQueryText(query: string | undefined, namedKeywords: string[]): Query {
  const positivePairs: Record<string, string[]> = {};
  const negativePairs: Record<string, string[]> = {};
  let text = query;
  if (query) {
    const splits = query.split(" ");
    const texts: string[] = [];
    for (const s of splits) {
      if (s.indexOf("=") > 0) {
        const parts = s.split("=");
        const keyRaw = parts[0];
        const negative = keyRaw.endsWith("!");
        const key = (negative ? keyRaw.slice(0, keyRaw.length - 1) : keyRaw).toLocaleLowerCase();
        if (namedKeywords.includes(key)) {
          const val = parts.slice(1).join("=");
          if (val) {
            const pairs = negative ? negativePairs : positivePairs;
            if (key in pairs) {
              pairs[key].push(val);
            } else {
              pairs[key] = [val];
            }
          }
          continue;
        }
      }
      texts.push(s);
    }
    text = texts.join(" ");
  }
  return {
    query: text,
    named: positivePairs,
    negativeNamed: negativePairs,
  };
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  } else {
    if (typeof error === "string") {
      return error as string;
    }
    return "Unknown Error";
  }
}

export function formatDate(input: Date | string): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return timeAgo.format(date) as string;
}

export function now(): Date {
  return new Date();
}

export function daysInSeconds(days: number): number {
  return days * 24 * 60 * 60;
}

export function showErrorToast(message: string, title?: string): Promise<Toast> {
  const t = title || "Something went wrong";
  return showToast({
    style: Toast.Style.Failure,
    title: t,
    message: message,
    primaryAction: {
      title: "Copy Error Message",
      onAction: (toast) => Clipboard.copy(`${t}: ${toast.message ?? ""}`),
      shortcut: { modifiers: ["cmd", "shift"], key: "c" },
    },
  });
}

export const isWindows = process.platform === "win32";

export function shortify(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  if (maxLength <= 3) {
    return text.slice(0, maxLength);
  }
  return text.slice(0, maxLength - 3) + "...";
}
