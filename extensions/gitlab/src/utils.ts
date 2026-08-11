import { getPreferenceValues, Image, Keyboard } from "@raycast/api";
import { Project } from "./gitlabapi";
import { getSVGText, GitLabIcons } from "./icons";
import * as fsSync from "fs";
import { constants } from "fs";
import * as crypto from "crypto";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";
import urljoin from "url-join";
import { emojiSymbol } from "./components/status/utils";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

export const copyShortcut: Keyboard.Shortcut = { modifiers: ["cmd"], key: "." };
export const copySecondaryShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "." };
export const copyMarkdownShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "ctrl"], key: "." };

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

export function projectFullPathFromWebUrl(webUrl: string): string {
  if (!webUrl) {
    return "";
  }
  try {
    return new URL(webUrl).pathname.replace(/^\//, "");
  } catch {
    return "";
  }
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

export function getIdFromGqlId(id: string): number {
  const splits = id.split("/");
  return parseInt(splits.pop() || "");
}

export function fileExistsSync(filename: string): boolean {
  try {
    fsSync.accessSync(filename, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function replaceAll(str: string, find: RegExp, replace: string): string {
  return str.replace(find, replace);
}

function resolveMarkdownUrl(link: string, baseUrl: string, projectId?: number): string {
  const trimmed = link.trim();
  if (/^(https?:|mailto:|#)/i.test(trimmed)) {
    return trimmed;
  }
  const uploadsPath = trimmed.replace(/^\//, "");
  if (projectId && uploadsPath.startsWith("uploads/")) {
    try {
      const instanceUrl = new URL(baseUrl).origin;
      return urljoin(instanceUrl, `-/project/${projectId}`, uploadsPath);
    } catch {
      // fall through
    }
  }
  try {
    if (trimmed.startsWith("/")) {
      return new URL(trimmed, baseUrl).href;
    }
    return urljoin(baseUrl, trimmed);
  } catch {
    return trimmed;
  }
}

export function optimizeMarkdownText(text: string, baseUrl?: string, projectId?: number): string {
  let result = text;
  // remove html comments
  result = replaceAll(result, /<!--[\s\S]*?-->/g, "");

  // remove cc
  result = replaceAll(result, /^\/cc.*/gm, "");

  // <br> to markdown new line
  result = replaceAll(result, /<br>/g, "  \n");

  // replace all emojis
  result = result.replace(/:(\w+):/g, (original, emoji) => emojiSymbol(emoji) ?? original);

  if (baseUrl) {
    result = result.replace(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*\/?>/gi, (_, source) => {
      return `![](${resolveMarkdownUrl(source, baseUrl, projectId)})`;
    });
    result = result.replace(/!?\[([^[\]]*)\]\(([^)]+)\)/g, (match, label, link) => {
      const resolved = resolveMarkdownUrl(link, baseUrl, projectId);
      const image = match.startsWith("!") ? "!" : "";
      return `${image}[${label}](${resolved})`;
    });
  }

  // remove inline HTML tags
  result = replaceAll(result, /<[^>]+>/g, "");

  return result;
}

export function hashRecord(record: Record<string, unknown>, prefix?: string | undefined): string {
  const sha256 = crypto.createHash("sha256");
  Object.entries(record)
    .sort()
    .forEach(([key, value]) => {
      sha256.update(`${key}${value}`);
    });
  const hashHex = sha256.digest("hex");
  if (prefix) {
    return `${prefix}_${hashHex}`;
  } else {
    return hashHex;
  }
}

export function capitalizeFirstLetter(name: string): string {
  if (!name) {
    return name;
  }
  return name.replace(/^./, name[0].toUpperCase());
}

export function toFormValues(values: Record<string, unknown>): Record<string, string> {
  const formValues: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value) {
      if (Array.isArray(value)) {
        if (value.length > 0) {
          formValues[key] = value.join(",");
        } else {
          continue;
        }
      } else {
        formValues[key] = String(value);
      }
    }
  }
  return formValues;
}

export function stringToSlug(str: string): string {
  str = str.replace(/^\s+|\s+$/g, ""); // trim
  str = str.toLowerCase();

  // remove accents, swap ñ for n, etc
  const from = "åàáãäâèéëêìíïîòóöôùúüûñç·/_,:;";
  const to = "aaaaaaeeeeiiiioooouuuunc------";

  for (let index = 0, fromLength = from.length; index < fromLength; index++) {
    str = str.replace(new RegExp(from.charAt(index), "g"), to.charAt(index));
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
    for (const segment of splits) {
      if (segment.indexOf("=") > 0) {
        const parts = segment.split("=");
        const keyRaw = parts[0];
        const negative = keyRaw.endsWith("!");
        const key = (negative ? keyRaw.slice(0, keyRaw.length - 1) : keyRaw).toLocaleLowerCase();
        if (namedKeywords.includes(key)) {
          const value = parts.slice(1).join("=");
          if (value) {
            const pairs = negative ? negativePairs : positivePairs;
            if (key in pairs) {
              pairs[key].push(value);
            } else {
              pairs[key] = [value];
            }
          }
          continue;
        }
      }
      texts.push(segment);
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

/** Absolute date/time string used for tooltips (the relative form is `formatDate`). */
export function formatDateTime(input: Date | string): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return date.toLocaleString();
}

export function formatDurationHuman(totalSeconds: number): string {
  let remaining = Math.floor(totalSeconds);
  const days = Math.floor(remaining / 86400);
  remaining %= 86400;
  const hours = Math.floor(remaining / 3600);
  remaining %= 3600;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const parts: string[] = [];
  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} min`);
  }
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds} sec`);
  }
  return parts.join(" ");
}

export interface Preferences {
  instance: string;
  authType?: "pat" | "oauth";
  token: string;
  oauthClientId?: string;
  artifactDownloadDirectory?: string;
  primaryaction: "browser" | "detail";
  poptoroot: boolean;
  includeEpicAncestor: boolean;
  ignorecerts: boolean;
  customcacert?: string;
  customcert?: string;
  excludeTodoAuthorUsernames?: string;
  active?: boolean;
  flatlist?: boolean;
  maxtodos?: string;
  alwaysshow?: boolean;
  showtext?: boolean;
  grayicon?: boolean;
  maxitems?: string;
  assignedLabels?: string;
  createdLabels?: string;
  reviewLabels?: string;
  includeLabels?: string;
  excludeLabels?: string;
  hideArchived?: boolean;
}

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

const DEFAULT_GITLAB_INSTANCE = "https://gitlab.com";

// OAuth scopes requested during the PKCE flow. Not user-configurable: the
// OAuth application's scope checkboxes are the real security gate, and a
// textfield for scopes mostly produces typos and cryptic `invalid_scope`
// errors. The application must be registered with at least these scopes.
export const OAUTH_SCOPES = ["api", "read_user", "read_repository"] as const;

export function getInstance(preferences: Preferences = getPreferences()): string {
  return (preferences.instance.trim() || DEFAULT_GITLAB_INSTANCE).replace(/\/+$/, "");
}

export function isOAuthEnabled(preferences: Preferences = getPreferences()): boolean {
  return preferences.authType === "oauth";
}

export function requireOAuthClientId(preferences: Preferences = getPreferences()): string {
  const clientId = preferences.oauthClientId?.trim();
  if (!clientId) {
    throw new Error(
      "GitLab OAuth Application ID is not configured. Open the GitLab extension preferences and either set the Application ID or switch Authentication back to Personal Access Token.",
    );
  }
  return clientId;
}

export function requirePersonalAccessToken(preferences: Preferences = getPreferences()): string {
  const token = preferences.token?.trim();
  if (!token) {
    throw new Error(
      "GitLab API Token is not configured. Open the GitLab extension preferences and either set the API Token or switch Authentication to OAuth.",
    );
  }
  return token;
}

export function parseCommaSeparatedPreference(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function getBoundedPreferenceNumber(
  preferenceText: string | undefined,
  params: { min?: number; max?: number; default?: number } = {},
): number {
  const boundMin = params.min ?? 1;
  const boundMax = params.max ?? 100;
  const fallback = params.default ?? 10;
  const max = Number(preferenceText ?? "");
  if (isNaN(max) || max < boundMin || max > boundMax) {
    return fallback;
  }
  return max;
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
