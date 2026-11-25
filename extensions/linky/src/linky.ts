import { getApplications } from "@raycast/api";
import { execFile } from "child_process";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { homedir } from "os";
import { basename, dirname, join } from "path";
import { promisify } from "util";

export const BUNDLE_ID = "app.linky.Linky";
export const DOWNLOAD_URL = "https://github.com/AlbrechtSuerer/linky/releases/latest";
const STORE_PATH = join(homedir(), "Library/Application Support/Linky/links.json");

/** One entry of Linky's links.json. */
interface StoredLink {
  id: string;
  path: string;
  created: string;
  lastUsed?: string;
}

export interface LinkItem {
  id: string;
  path: string;
  name: string;
  folder: string;
  used: Date;
  missing: boolean;
}

/** The extension relies on linky:// routes that arrived in Linky 1.3. */
export const MIN_LINKY_VERSION = "1.3";

/** "missing": Linky is not installed. "outdated": older than 1.3, so it would ignore the extension's links. */
export type LinkyStatus = "ready" | "missing" | "outdated";

export async function getLinkyStatus(): Promise<LinkyStatus> {
  const app = (await getApplications()).find((a) => a.bundleId === BUNDLE_ID);
  if (!app) {
    return "missing";
  }
  try {
    const { stdout } = await promisify(execFile)("/usr/bin/plutil", [
      "-extract",
      "CFBundleShortVersionString",
      "raw",
      join(app.path, "Contents/Info.plist"),
    ]);
    return isVersionAtLeast(stdout.trim(), MIN_LINKY_VERSION) ? "ready" : "outdated";
  } catch {
    // Version unreadable: don't block an app that may well work.
    return "ready";
  }
}

/** Compares dotted versions numerically: "1.10" is newer than "1.3". */
export function isVersionAtLeast(version: string, minimum: string): boolean {
  const a = version.split(".").map((part) => parseInt(part, 10) || 0);
  const b = minimum.split(".").map((part) => parseInt(part, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) {
      return x > y;
    }
  }
  return true;
}

/** Builds a linky:// URL. Values are percent-encoded so Linky reads them back exactly. */
export function linkyURL(action: string, params: Record<string, string | string[]> = {}): string {
  const query = Object.entries(params)
    .flatMap(([key, value]) => (Array.isArray(value) ? value : [value]).map((v) => `${key}=${encodeURIComponent(v)}`))
    .join("&");
  return query ? `linky://${action}?${query}` : `linky://${action}`;
}

/** Hands a linky:// URL to Linky in the background, without bringing any window forward. */
export async function sendToLinky(url: string): Promise<void> {
  await promisify(execFile)("/usr/bin/open", ["-g", url]);
}

function displayFolder(path: string): string {
  const folder = dirname(path);
  const home = homedir();
  return folder === home || folder.startsWith(home + "/") ? "~" + folder.slice(home.length) : folder;
}

function isMissing(path: string): boolean {
  return !existsSync(path) || path.includes("/.Trash/") || path.includes("/.Trashes/");
}

/** Asks Linky to re-check moved files, then reads its link list (most recently used first). */
export async function loadLinks(): Promise<LinkItem[]> {
  try {
    await sendToLinky(linkyURL("refresh"));
    await new Promise((resolve) => setTimeout(resolve, 300));
  } catch {
    // Linky not reachable: show what is stored.
  }

  // No link list yet means no links. Any other problem is reported, not shown as an empty list.
  if (!existsSync(STORE_PATH)) {
    return [];
  }
  const raw = await readFile(STORE_PATH, "utf8");

  let stored: StoredLink[];
  try {
    stored = JSON.parse(raw) as StoredLink[];
  } catch {
    throw new Error("Linky's link list is damaged and could not be read.");
  }
  if (!Array.isArray(stored)) {
    throw new Error("Linky's link list has an unexpected format.");
  }
  return stored
    .map((link) => ({
      id: link.id,
      path: link.path,
      name: link.path === "/" ? "Macintosh HD" : basename(link.path),
      folder: displayFolder(link.path),
      used: new Date(link.lastUsed ?? link.created),
      missing: isMissing(link.path),
    }))
    .sort((a, b) => b.used.getTime() - a.used.getTime());
}
