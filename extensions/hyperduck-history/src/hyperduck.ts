import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

/** Hyperduck (Mac) keeps its received-link history in this shared group-container preferences file. */
export const HYPERDUCK_PLIST = join(
  homedir(),
  "Library/Group Containers/group.com.sindresorhus.Hyperduck.shared/Library/Preferences/group.com.sindresorhus.Hyperduck.shared.plist",
);

/** Seconds between the Unix epoch (1970) and the Apple reference date (2001-01-01 UTC). */
export const APPLE_EPOCH_OFFSET_SECONDS = 978307200;

export interface HyperduckLink {
  id: string;
  url: string;
  /** Unix time in milliseconds. */
  date: number;
}

export interface HyperduckHistory {
  /** Value of Hyperduck's "isHistoryEnabled" setting. Missing key counts as enabled. */
  enabled: boolean;
  links: HyperduckLink[];
}

export type HyperduckErrorKind = "missing" | "denied" | "unreadable";

export class HyperduckError extends Error {
  kind: HyperduckErrorKind;

  constructor(kind: HyperduckErrorKind, message: string) {
    super(message);
    this.name = "HyperduckError";
    this.kind = kind;
  }
}

export function appleSecondsToUnixMs(seconds: number): number {
  return Math.round((seconds + APPLE_EPOCH_OFFSET_SECONDS) * 1000);
}

/** One history entry is a JSON string: {"id": UUID, "url": string, "date": seconds since 2001}. */
export function parseEntry(raw: unknown): HyperduckLink | undefined {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return undefined;
    }
  }
  if (typeof value !== "object" || value === null) return undefined;
  const { id, url, date } = value as Record<string, unknown>;
  if (typeof url !== "string" || url.length === 0) return undefined;
  if (typeof date !== "number" || !Number.isFinite(date)) return undefined;
  return { id: typeof id === "string" && id.length > 0 ? id : `${url}@${date}`, url, date: appleSecondsToUnixMs(date) };
}

export function parseHistory(history: unknown, enabled = true): HyperduckHistory {
  const entries = Array.isArray(history) ? history : [];
  const links = entries.map(parseEntry).filter((link): link is HyperduckLink => link !== undefined);
  return { enabled, links: sortNewestFirst(links) };
}

export function sortNewestFirst(links: HyperduckLink[]): HyperduckLink[] {
  return [...links].sort((a, b) => b.date - a.date);
}

/**
 * Merge the saved archive with the current Hyperduck history.
 * Entries are unique by id; the current history wins on conflict. Hidden ids are dropped.
 */
export function mergeLinks(
  archive: HyperduckLink[],
  current: HyperduckLink[],
  hidden: Iterable<string> = [],
): HyperduckLink[] {
  const hiddenIds = new Set(hidden);
  const byId = new Map<string, HyperduckLink>();
  for (const link of [...archive, ...current]) {
    if (!hiddenIds.has(link.id)) byId.set(link.id, link);
  }
  return sortNewestFirst([...byId.values()]);
}

/** Display title: host plus path, without the scheme, "www." and a trailing slash. */
export function displayTitle(url: string, maxLength = 80): string {
  let title = url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      const path = `${parsed.pathname}${parsed.search}`.replace(/\/$/, "");
      title = `${parsed.host.replace(/^www\./, "")}${path}`;
    }
  } catch {
    // Not a parseable URL: show it as is.
  }
  return title.length > maxLength ? `${title.slice(0, maxLength - 1)}…` : title;
}

function plutilExtract(data: Buffer, keyPath: string, format: "json" | "raw"): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    const child = execFile("plutil", ["-extract", keyPath, format, "-o", "-", "-"], (error, stdout, stderr) => {
      if (!error) return resolve(stdout);
      // plutil reports a missing key path as "No value at that key path or invalid key path".
      if (/no value at that key path/i.test(`${stderr}${stdout}`)) return resolve(undefined);
      reject(
        new HyperduckError("unreadable", `plutil could not read "${keyPath}": ${(stderr || error.message).trim()}`),
      );
    });
    child.stdin?.end(data);
  });
}

export async function readHyperduckHistory(path = HYPERDUCK_PLIST): Promise<HyperduckHistory> {
  let data: Buffer;
  try {
    data = await readFile(path);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      throw new HyperduckError("missing", "Hyperduck history file not found. Is Hyperduck installed on this Mac?");
    }
    if (code === "EPERM" || code === "EACCES") {
      throw new HyperduckError(
        "denied",
        "macOS refused to let Raycast read Hyperduck's data. Allow Raycast to access data from other apps, then try again.",
      );
    }
    throw new HyperduckError("unreadable", `Could not read Hyperduck history: ${(error as Error).message}`);
  }

  const [historyJson, enabledRaw] = await Promise.all([
    plutilExtract(data, "history", "json"),
    plutilExtract(data, "isHistoryEnabled", "raw"),
  ]);
  const history = historyJson === undefined ? [] : JSON.parse(historyJson);
  const enabled = enabledRaw === undefined ? true : enabledRaw.trim() !== "false";
  return parseHistory(history, enabled);
}
