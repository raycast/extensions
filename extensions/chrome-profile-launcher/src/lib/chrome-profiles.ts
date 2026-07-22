import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import type { ChromeProfile } from "../types";
import { getUserDataDir } from "./chrome-paths";
import { decodeChromeColor, generatedColor } from "./chrome-color";

/** A single info_cache entry. Every field is `unknown` because Chrome's schema
 * varies by version and entries can be partial or malformed — we type-guard at
 * the point of use rather than trusting the shape. */
type InfoCacheEntry = {
  name?: unknown;
  user_name?: unknown;
  gaia_name?: unknown;
  gaia_picture_file_name?: unknown;
  profile_color_seed?: unknown;
};

type LocalState = {
  profile?: {
    info_cache?: Record<string, InfoCacheEntry>;
    profiles_order?: unknown;
  };
};

/** Directories that live in Chrome's data folder but are not user profiles;
 * excluded from the fallback directory scan. */
const NON_USER_DIRS = new Set(["System Profile", "Guest Profile"]);

/** Parse a JSON file, returning undefined on any problem (missing, unreadable,
 * invalid JSON, permission error). Never throws. */
function readJsonSafe<T>(path: string): T | undefined {
  try {
    if (!existsSync(path)) {
      return undefined;
    }
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return undefined;
  }
}

/** First non-empty string among the candidates, trimmed. */
function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

/** Read a profile's display name from its Preferences file. Guarded: a missing
 * or malformed Preferences file yields undefined, never an exception. */
function readPreferencesName(profilePath: string): string | undefined {
  const prefs = readJsonSafe<{ profile?: { name?: unknown } }>(join(profilePath, "Preferences"));
  return firstString(prefs?.profile?.name);
}

/** The account email, when `user_name` looks like an email address. */
function pickEmail(entry: InfoCacheEntry): string | undefined {
  const userName = firstString(entry.user_name);
  return userName && userName.includes("@") ? userName : undefined;
}

/** Absolute path to a profile's local photo, if the referenced file exists. */
function resolveAvatarPath(profilePath: string, entry: InfoCacheEntry): string | undefined {
  const fileName = firstString(entry.gaia_picture_file_name);
  if (!fileName) {
    return undefined;
  }
  const path = join(profilePath, fileName);
  return existsSync(path) ? path : undefined;
}

/** The profile's real Chrome color, or a stable generated fallback. */
function pickColor(
  directory: string,
  entry: InfoCacheEntry,
): { color: string; colorSource: ChromeProfile["colorSource"] } {
  const seed = typeof entry.profile_color_seed === "number" ? entry.profile_color_seed : undefined;
  const chromeColor = decodeChromeColor(seed);
  return chromeColor
    ? { color: chromeColor, colorSource: "chrome" }
    : { color: generatedColor(directory), colorSource: "generated" };
}

/**
 * Resolve a display name by priority. `preferencesName` is passed in (already
 * read, or undefined if that read failed) so this stays pure and testable.
 * Priority: info_cache.name → Preferences.profile.name → gaia_name → user_name
 * → directory.
 */
export function pickName(directory: string, entry: InfoCacheEntry, preferencesName?: string): string {
  return firstString(entry.name, preferencesName, entry.gaia_name, entry.user_name) ?? directory;
}

/**
 * Find the single best profile match for a free-text query (used by the
 * argument command / quicklinks). Tiered so an exact, unique directory always
 * wins: exact directory → exact name → exact email → prefix → substring.
 * Returns undefined for a blank query or no match. Pure and testable.
 */
export function resolveProfileQuery(profiles: ChromeProfile[], query: string): ChromeProfile | undefined {
  const q = query.trim().toLowerCase();
  if (!q) {
    return undefined;
  }
  return (
    profiles.find((p) => p.directory.toLowerCase() === q) ??
    profiles.find((p) => p.name.toLowerCase() === q) ??
    profiles.find((p) => p.email?.toLowerCase() === q) ??
    profiles.find((p) => p.name.toLowerCase().startsWith(q) || p.directory.toLowerCase().startsWith(q)) ??
    profiles.find(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.directory.toLowerCase().includes(q) ||
        (p.email?.toLowerCase().includes(q) ?? false),
    )
  );
}

/** Sort by Chrome's own `profiles_order`; anything not listed is appended
 * alphabetically by display name. Pure and testable. */
export function sortByChromeOrder(profiles: ChromeProfile[], order: string[]): ChromeProfile[] {
  const rank = new Map(order.map((directory, index) => [directory, index]));
  const rankOf = (directory: string) => (rank.has(directory) ? rank.get(directory)! : Number.MAX_SAFE_INTEGER);
  return [...profiles].sort((a, b) => {
    const delta = rankOf(a.directory) - rankOf(b.directory);
    return delta !== 0 ? delta : a.name.localeCompare(b.name);
  });
}

/** Primary path: build profiles from Local State's info_cache. Returns [] if
 * Local State is missing/invalid or has no usable info_cache. Resilient: each
 * entry is guarded, ghosts (missing dirs) are filtered, one bad entry can't take
 * down the list. */
function profilesFromInfoCache(userDataDir: string): ChromeProfile[] {
  const localState = readJsonSafe<LocalState>(join(userDataDir, "Local State"));
  const infoCache = localState?.profile?.info_cache;
  if (!infoCache || typeof infoCache !== "object") {
    return [];
  }

  const profiles: ChromeProfile[] = [];
  for (const [directory, entry] of Object.entries(infoCache)) {
    try {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const profilePath = join(userDataDir, directory);
      if (!existsSync(profilePath)) {
        continue;
      }
      const { color, colorSource } = pickColor(directory, entry);
      profiles.push({
        directory,
        name: pickName(directory, entry, readPreferencesName(profilePath)),
        email: pickEmail(entry),
        avatarPath: resolveAvatarPath(profilePath, entry),
        color,
        colorSource,
        isDefault: directory === "Default",
      });
    } catch {
      // One bad entry must never take down the entire list.
      continue;
    }
  }

  const order = localState?.profile?.profiles_order;
  return sortByChromeOrder(
    profiles,
    Array.isArray(order) ? order.filter((d): d is string => typeof d === "string") : [],
  );
}

/** Directory entries (with file types) for a path, or [] on any error. Return
 * type is inferred so `entry.name` stays a string across @types/node versions
 * (annotating it as Dirent[] can resolve to a Buffer-named variant). */
function readProfileDirEntries(userDataDir: string) {
  try {
    return readdirSync(userDataDir, { withFileTypes: true });
  } catch {
    return [];
  }
}

/** Fallback path: when Local State is unusable, discover profiles by scanning
 * the data directory for any subfolder containing a `Preferences` file. Catches
 * custom-named directories (e.g. "Andy") that a `Profile *` glob would miss.
 * Colors are generated (no real Chrome color is available here). */
function scanProfileDirectories(userDataDir: string): ChromeProfile[] {
  const profiles: ChromeProfile[] = [];
  for (const entry of readProfileDirEntries(userDataDir)) {
    try {
      if (!entry.isDirectory() || NON_USER_DIRS.has(entry.name)) {
        continue;
      }
      const profilePath = join(userDataDir, entry.name);
      if (!existsSync(join(profilePath, "Preferences"))) {
        continue;
      }
      profiles.push({
        directory: entry.name,
        name: readPreferencesName(profilePath) ?? entry.name,
        color: generatedColor(entry.name),
        colorSource: "generated",
        isDefault: entry.name === "Default",
      });
    } catch {
      continue;
    }
  }

  return sortByChromeOrder(profiles, []);
}

/**
 * Load Chrome profiles. Prefers Local State's info_cache (real names, colors,
 * avatars); if that is missing/invalid/empty, falls back to a directory scan.
 * Never throws — the worst case is an empty list, a valid runnable state.
 *
 * `userDataDir` is injectable for testing; defaults to the real Chrome dir.
 */
export async function loadProfiles(userDataDir: string = getUserDataDir()): Promise<ChromeProfile[]> {
  const fromCache = profilesFromInfoCache(userDataDir);
  if (fromCache.length > 0) {
    return fromCache;
  }
  return scanProfileDirectories(userDataDir);
}
