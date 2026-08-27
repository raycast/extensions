import { Color, Icon } from "@raycast/api";
import type { FileType, Privacy } from "./types";

export function fileIcon(type: FileType): { source: Icon; tintColor?: Color } {
  switch (type) {
    case "directory":
      return { source: Icon.Folder };
    case "http":
      return { source: Icon.Globe, tintColor: Color.Blue };
    case "interval":
      return { source: Icon.Clock, tintColor: Color.Purple };
    case "email":
      return { source: Icon.Envelope, tintColor: Color.Orange };
    case "script":
      return { source: Icon.Terminal, tintColor: Color.Green };
    default:
      return { source: Icon.Document };
  }
}

/** Private is the quiet default and gets no label; the other two say how far the code reaches. */
export function privacyColor(privacy: Privacy): Color | undefined {
  switch (privacy) {
    case "public":
      return Color.Green;
    case "unlisted":
      return Color.Yellow;
    default:
      return undefined;
  }
}

/**
 * Its own pair of hues. Green and yellow belong to code visibility, orange to must-confirm, purple
 * to agent access and red to a broken config — so app access gets blue and magenta.
 */
export function appAccessColor(appAccess: "public" | "restricted"): Color {
  return appAccess === "restricted" ? Color.Magenta : Color.Blue;
}

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  ts: "ts",
  tsx: "tsx",
  js: "js",
  jsx: "jsx",
  json: "json",
  md: "md",
  html: "html",
  css: "css",
  txt: "text",
  yml: "yaml",
  yaml: "yaml",
  sql: "sql",
};

function languageFor(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  return LANGUAGE_BY_EXTENSION[extension] ?? "";
}

export function codeBlock(content: string, path: string): string {
  return `\`\`\`${languageFor(path)}\n${content}\n\`\`\``;
}

export function formatDateTime(value: string | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

const RELATIVE_STEPS: [limit: number, divisor: number, unit: Intl.RelativeTimeFormatUnit][] = [
  [60, 1, "second"],
  [3600, 60, "minute"],
  [86400, 3600, "hour"],
  [604800, 86400, "day"],
  [2629800, 604800, "week"],
  [31557600, 2629800, "month"],
  [Infinity, 31557600, "year"],
];

export function formatRelative(value: string | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const seconds = (Date.now() - date.getTime()) / 1000;
  if (seconds < 60) return "less than a minute ago";

  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "always" });
  const [, divisor, unit] =
    RELATIVE_STEPS.find(([limit]) => seconds < limit) ?? RELATIVE_STEPS[RELATIVE_STEPS.length - 1];
  return formatter.format(-Math.floor(seconds / divisor), unit);
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
