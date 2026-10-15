import { URL } from "url";
import { lstat, rename, rm, writeFile } from "fs/promises";
import { homedir } from "os";
import { dirname, join, resolve } from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";
import { BrowserConfig, Profile } from "./types";

import { readChromeLocalState } from "./profiles";

const execFileAsync = promisify(execFile);

const isProfileOpen = async (profilePath: string) => {
  try {
    const { stdout } = await execFileAsync("/usr/sbin/lsof", ["-nP", "-t", "+D", profilePath], { timeout: 10000 });
    return stdout.trim().length > 0;
  } catch (error) {
    const output = error instanceof Error && "stdout" in error ? String(error.stdout) : "";
    if (output.trim()) return true;
    const code = error instanceof Error ? (error as { code?: string | number }).code : undefined;
    if (code === 1 || code === "1") return false;
    throw new Error("Could not determine whether the Chrome profile is open");
  }
};

const writeFileAtomically = async (path: string, text: string) => {
  const temporaryPath = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, text, "utf8");
    await rename(temporaryPath, path);
  } finally {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
  }
};

export const deleteChromeProfile = async (profile: Profile, browser: BrowserConfig) => {
  const dataDirectory = resolve(homedir(), browser.dataPath);
  const profilePath = resolve(dataDirectory, profile.directory);
  if (dirname(profilePath) !== dataDirectory) throw new Error("Invalid Chrome profile directory");

  const { path: localStatePath, text: originalLocalStateText, state: localState } = await readChromeLocalState(browser);
  const infoCache = localState.profile?.info_cache;
  if (!infoCache || !Object.prototype.hasOwnProperty.call(infoCache, profile.directory)) {
    throw new Error("Profile no longer exists");
  }
  if (Object.keys(infoCache).length === 1) throw new Error("Chrome must keep at least one profile");

  let profileStats;
  try {
    profileStats = await lstat(profilePath);
  } catch (error) {
    if (!(error instanceof Error) || (error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (profileStats && !profileStats.isDirectory()) throw new Error("Chrome profile path is not a directory");

  let deletedProfilePath: string | undefined;
  if (profileStats) {
    if (await isProfileOpen(profilePath)) throw new Error(`Close the ${profile.name} profile before deleting it`);
    deletedProfilePath = join(dataDirectory, `.raycast-delete-${randomUUID()}`);
    await rename(profilePath, deletedProfilePath);
  }

  try {
    if (deletedProfilePath && (await isProfileOpen(deletedProfilePath))) {
      throw new Error(`Close the ${profile.name} profile before deleting it`);
    }
    delete infoCache[profile.directory];
    localState.profile.last_active_profiles = localState.profile.last_active_profiles?.filter(
      (directory) => directory !== profile.directory,
    );
    localState.profile.profiles_order = localState.profile.profiles_order?.filter(
      (directory) => directory !== profile.directory,
    );
    if (localState.profile.last_used === profile.directory) {
      localState.profile.last_used = Object.keys(infoCache)[0];
    }
    await writeFileAtomically(localStatePath, `${JSON.stringify(localState, null, 2)}\n`);
  } catch (error) {
    try {
      if (deletedProfilePath) await rename(deletedProfilePath, profilePath);
      await writeFileAtomically(localStatePath, originalLocalStateText);
    } catch {
      throw new Error("Profile deletion failed and could not be rolled back");
    }
    throw error;
  }

  if (deletedProfilePath) {
    try {
      await rm(deletedProfilePath, { recursive: true, force: true });
    } catch (error) {
      try {
        await rename(deletedProfilePath, profilePath);
        await writeFileAtomically(localStatePath, originalLocalStateText);
      } catch {
        throw new Error("Profile deletion failed and could not be rolled back");
      }
      throw error;
    }
  }
  return localState;
};

export const createBookmarkListItem = (url: string, name?: string) => {
  const urlToDisplay = url.replace(/(^\w+:|^)\/\//, "");
  let iconURL: string | undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      iconURL = parsed.origin;
    }
  } catch {
    // opaque or invalid URL; fall through to globe icon
  }
  return {
    url: url,
    title: name ? name : urlToDisplay,
    subtitle: name ? urlToDisplay : undefined,
    iconURL,
  };
};

/**
 * Naive implementation. This can certainly be improved.
 */
export const matchSearchText = (searchText: string, url: string, name?: string) => {
  const searchWords = searchText
    .split(" ")
    .flatMap((e) => e.split("/"))
    .flatMap((e) => e.split("."))
    .filter((e) => e)
    .map(lowerCased);

  const nameWords =
    name
      ?.split(" ")
      .map(lowerCased)
      .filter((e) => e) ?? [];

  if (hasMatch(searchWords, nameWords)) {
    return true;
  }

  const urlWords = url
    .replace("https://", "")
    .replace("http://", "")
    .split("/")
    .flatMap((e) => e.split("."))
    .filter((e) => e)
    .map(lowerCased);

  if (hasMatch(searchWords, urlWords)) {
    return true;
  }

  return false;
};

const lowerCased = (text: string) => text.toLowerCase();

const hasMatch = (search: string[], words: string[]) => {
  for (const element of search) {
    for (const word of words) {
      if (word.includes(element)) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Determines whether a string is a valid, launchable URL for a Chrome profile launcher.
 *
 * This validator is intentionally *opinionated* and aligned with how Chrome users
 * expect URLs to behave, rather than with generic RFC or WHATWG URL validity.
 *
 * The function:
 * - Accepts only explicit, absolute URLs (no implicit scheme repair).
 * - Allows Chrome-navigable schemes that users commonly open in a tab.
 * - Explicitly blocks execution-oriented schemes (bookmarklets).
 *
 * ✅ Allowed schemes:
 *   - http://
 *   - https://
 *   - chrome://
 *   - chrome-extension://
 *   - about:
 *   - view-source:
 *
 * 🚫 Explicitly rejected schemes:
 *   - javascript:
 *   - data:
 *   - vbscript:
 *
 * ❌ Rejected inputs include:
 *   - URLs requiring parser repair (e.g. "http:/example.com", "http:example.com")
 *   - Relative paths ("/settings", "../index.html")
 *   - Bare hostnames ("example.com")
 *   - Bookmarklets or executable payloads
 *
 * The function does NOT:
 * - Check reachability or network availability
 * - Validate host existence or DNS
 * - Guarantee that Chrome will successfully open the URL (some chrome:// pages are restricted)
 *
 * This behavior is intentional and optimized for safe, predictable profile launching.
 */
export function isValidUrl(str: string): boolean {
  if (typeof str !== "string") return false;

  const trimmed = str.trim();

  // Explicit deny list (execution vectors)
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    return false;
  }

  try {
    const url = new URL(trimmed);

    // Allowlist of schemes Chrome users expect
    switch (url.protocol) {
      case "http:":
      case "https:":
      case "chrome:":
      case "chrome-extension:":
      case "about:":
        return true;

      case "view-source:":
        // view-source: can wrap another URL; require something after it
        return trimmed.length > "view-source:".length;

      default:
        return false;
    }
  } catch {
    return false;
  }
}

export const formatAsUrl = (str: string) => {
  if (str.startsWith("http://") || str.startsWith("https://")) {
    return str;
  } else {
    return `https://${str}`;
  }
};

export type { ChromeTarget } from "./chrome";
export { ChromeAction, openGoogleChrome } from "./chrome";
export { readChromeLocalState } from "./profiles";
