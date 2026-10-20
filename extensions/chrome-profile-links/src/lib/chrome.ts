import { Color, Icon, Image } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const CHROME_APP_NAME = "Google Chrome";
export const CHROME_DATA_DIR = join(homedir(), "Library", "Application Support", "Google", "Chrome");

export interface ChromeProfile {
  /** Directory name Chrome uses internally, e.g. "Default" or "Profile 1". */
  directory: string;
  /** Name shown in Chrome's profile menu. */
  name: string;
  /** Signed-in account email, if any. */
  email?: string;
  icon: Image.ImageLike;
}

interface InfoCacheEntry {
  name?: string;
  user_name?: string;
  gaia_picture_file_name?: string | null;
  profile_highlight_color?: number;
}

interface LocalState {
  profile?: {
    info_cache?: Record<string, InfoCacheEntry>;
    profiles_order?: string[];
    last_used?: string;
  };
}

/** Chrome stores colors as signed 32-bit ARGB integers. */
function argbToHex(argb: number): string {
  return `#${((argb >>> 0) & 0xffffff).toString(16).padStart(6, "0")}`;
}

function profileIcon(directory: string, entry: InfoCacheEntry): Image.ImageLike {
  if (entry.gaia_picture_file_name) {
    const picture = join(CHROME_DATA_DIR, directory, entry.gaia_picture_file_name);
    if (existsSync(picture)) {
      return { source: picture, mask: Image.Mask.Circle };
    }
  }
  const tintColor = entry.profile_highlight_color !== undefined ? argbToHex(entry.profile_highlight_color) : Color.Blue;
  return { source: Icon.PersonCircle, tintColor };
}

async function readLocalState(): Promise<LocalState> {
  let raw: string;
  try {
    raw = await readFile(join(CHROME_DATA_DIR, "Local State"), "utf8");
  } catch {
    throw new Error("Google Chrome profile data was not found. Is Google Chrome installed?");
  }
  return JSON.parse(raw) as LocalState;
}

export async function getChromeProfiles(): Promise<ChromeProfile[]> {
  const { profile } = await readLocalState();
  const infoCache = profile?.info_cache ?? {};
  const order = profile?.profiles_order ?? [];
  const directories = [
    ...order.filter((d) => d in infoCache),
    ...Object.keys(infoCache).filter((d) => !order.includes(d)),
  ];

  return directories.map((directory) => {
    const entry = infoCache[directory];
    return {
      directory,
      name: entry.name || directory,
      email: entry.user_name || undefined,
      icon: profileIcon(directory, entry),
    };
  });
}

export async function openInChromeProfile(url: string, profileDirectory: string): Promise<void> {
  await execFileAsync("open", ["-na", CHROME_APP_NAME, "--args", `--profile-directory=${profileDirectory}`, url]);
}

export interface ActiveTab {
  url: string;
  title: string;
  /** Best guess of the profile the front window belongs to. */
  profileDirectory?: string;
}

/** Returns the active tab of Chrome's front window, without launching Chrome if it is not running. */
export async function getActiveChromeTab(): Promise<ActiveTab | undefined> {
  const output = await runAppleScript(`
    if application "${CHROME_APP_NAME}" is not running then return ""
    tell application "${CHROME_APP_NAME}"
      if (count of windows) is 0 then return ""
      set t to active tab of front window
      return (URL of t) & linefeed & (title of t)
    end tell
  `);
  const [url, ...titleLines] = output.split("\n");
  if (!/^(https?|file):/.test(url)) return undefined;

  return { url, title: titleLines.join(" ").trim(), profileDirectory: await getFrontWindowProfileDirectory() };
}

/**
 * Chrome's AppleScript dictionary does not expose profiles, so the profile is inferred:
 * 1. With multiple profiles, Chrome appends " - <profile name>" to its window titles (needs Accessibility access).
 * 2. Otherwise, fall back to the last used profile recorded in "Local State".
 */
async function getFrontWindowProfileDirectory(): Promise<string | undefined> {
  const profiles = await getChromeProfiles();

  let windowTitle = "";
  try {
    windowTitle = await runAppleScript(
      `tell application "System Events" to tell process "${CHROME_APP_NAME}" to return name of window 1`,
    );
  } catch {
    // Accessibility access denied; fall through to "Local State".
  }
  const byTitle = profiles
    .filter((p) => windowTitle.endsWith(` - ${p.name}`))
    .sort((a, b) => b.name.length - a.name.length)[0];
  if (byTitle) return byTitle.directory;

  const lastUsed = (await readLocalState()).profile?.last_used;
  return profiles.some((p) => p.directory === lastUsed) ? lastUsed : undefined;
}
