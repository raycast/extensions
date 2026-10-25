import { execFile } from "child_process";
import { readFileSync, readdirSync } from "fs";
import { homedir } from "os";
import { basename, isAbsolute, join, resolve } from "path";

export const FIREFOX_DIR = join(homedir(), "Library", "Application Support", "Firefox");

export interface FirefoxProfile {
  /** Absolute profile directory. */
  path: string;
  name: string;
  /** Firefox avatar name (e.g. "book") or a path to a custom avatar image. */
  avatar: string | null;
}

/**
 * Map Firefox's built-in profile avatars to the closest Raycast `Icon` name.
 * Avatars without a close match use `DEFAULT_AVATAR_ICON`.
 */
export const AVATAR_ICONS: Record<string, string> = {
  barbell: "Weights",
  bike: "Bike",
  book: "Book",
  canvas: "Image",
  craft: "Brush",
  flower: "Leaf",
  folder: "Folder",
  hammer: "Hammer",
  heart: "Heart",
  "heart-rate": "Heartbeat",
  history: "Clock",
  leaf: "Leaf",
  lightbulb: "LightBulb",
  makeup: "Brush",
  message: "Message",
  "musical-note": "Music",
  plane: "Airplane",
  present: "Gift",
  shopping: "Cart",
  soccer: "SoccerBall",
  "sparkle-single": "Stars",
  star: "Star",
  "video-game-controller": "GameController",
};

export const DEFAULT_AVATAR_ICON = "PersonCircle";

/** Number of distinct profile colours; see PROFILE_COLORS in search-tabs. */
export const PROFILE_COLOR_COUNT = 6;

/**
 * Parse the profiles listed in `profiles.ini`. Profiles created with Firefox's
 * newer profile manager are only in the profile group store, not here.
 */
export function parseProfilesIni(text: string, firefoxDir: string): FirefoxProfile[] {
  const profiles: FirefoxProfile[] = [];
  let section: Record<string, string> | null = null;
  const flush = () => {
    if (section?.Path) {
      const path = section.IsRelative === "0" ? section.Path : join(firefoxDir, section.Path);
      profiles.push({ path: resolve(path), name: section.Name || profileDirName(path), avatar: null });
    }
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const header = line.match(/^\[(.+)\]$/);
    if (header) {
      flush();
      section = /^Profile\d+$/.test(header[1]) ? {} : null;
      continue;
    }
    const eq = line.indexOf("=");
    if (section && eq > 0) {
      section[line.slice(0, eq)] = line.slice(eq + 1);
    }
  }
  flush();
  return profiles;
}

/**
 * Parse `sqlite3 -json` rows from a profile group store's `Profiles` table.
 */
export function parseStoreRows(json: string, firefoxDir: string): FirefoxProfile[] {
  if (!json.trim()) return [];
  const rows = JSON.parse(json) as Array<{ path?: unknown; name?: unknown; avatar?: unknown }>;
  return rows
    .filter((row) => typeof row.path === "string" && row.path)
    .map((row) => {
      const path = row.path as string;
      const abs = resolve(isAbsolute(path) ? path : join(firefoxDir, path));
      return {
        path: abs,
        name: typeof row.name === "string" && row.name ? row.name : profileDirName(abs),
        avatar: typeof row.avatar === "string" && row.avatar ? row.avatar : null,
      };
    });
}

/**
 * Fallback display name from a profile directory such as
 * `rgS3yvsW.Profile 1`: drop the random prefix Firefox adds.
 */
export function profileDirName(path: string): string {
  const dir = basename(path);
  const dot = dir.indexOf(".");
  return dot > 0 && dot < dir.length - 1 ? dir.slice(dot + 1) : dir;
}

/**
 * Combine profiles from the group store (in creation order, with names and
 * avatars from Firefox's profile manager) with any that only `profiles.ini`
 * knows about.
 */
export function mergeProfiles(store: FirefoxProfile[], ini: FirefoxProfile[]): FirefoxProfile[] {
  const seen = new Set(store.map((p) => p.path));
  return [...store, ...ini.filter((p) => !seen.has(p.path))];
}

function querySqlite(file: string): Promise<string> {
  return new Promise((resolvePromise) => {
    execFile(
      "/usr/bin/sqlite3",
      ["-readonly", "-json", file, "SELECT path, name, avatar FROM Profiles ORDER BY id"],
      { timeout: 2000 },
      (err, stdout) => resolvePromise(err ? "" : String(stdout))
    );
  });
}

/**
 * Load every Firefox profile on this Mac. Never rejects: missing or unreadable
 * sources contribute no profiles.
 */
export async function loadProfiles(firefoxDir: string = FIREFOX_DIR): Promise<FirefoxProfile[]> {
  let ini: FirefoxProfile[] = [];
  try {
    ini = parseProfilesIni(readFileSync(join(firefoxDir, "profiles.ini"), "utf-8"), firefoxDir);
  } catch {
    // No profiles.ini
  }

  let storeFiles: string[] = [];
  try {
    storeFiles = readdirSync(join(firefoxDir, "Profile Groups"))
      .filter((name) => name.endsWith(".sqlite"))
      .map((name) => join(firefoxDir, "Profile Groups", name));
  } catch {
    // Profile manager never used
  }

  const store: FirefoxProfile[] = [];
  for (const file of storeFiles) {
    try {
      store.push(...parseStoreRows(await querySqlite(file), firefoxDir));
    } catch {
      // Unexpected output: ignore this store
    }
  }

  return mergeProfiles(store, ini);
}

export interface ProfileLabel {
  name: string;
  /** Raycast `Icon` name, or a path to a custom avatar image. */
  icon: { name: string } | { path: string };
  /** Index into the profile colour palette. */
  colorIndex: number;
}

/**
 * Describe the profile at `profilePath` for display. The colour comes from
 * the profile's position among all known profiles, so it stays the same
 * whichever other profiles happen to be running.
 */
export function labelProfile(profilePath: string | null, profiles: FirefoxProfile[]): ProfileLabel | null {
  if (!profilePath) return null;
  const abs = resolve(profilePath);
  const index = profiles.findIndex((p) => p.path === abs);
  const profile = index >= 0 ? profiles[index] : null;

  let icon: ProfileLabel["icon"] = { name: DEFAULT_AVATAR_ICON };
  const avatar = profile?.avatar;
  if (avatar && isAbsolute(avatar)) {
    icon = { path: avatar };
  } else if (avatar && AVATAR_ICONS[avatar]) {
    icon = { name: AVATAR_ICONS[avatar] };
  }

  return {
    name: profile?.name ?? profileDirName(abs),
    icon,
    colorIndex: (index >= 0 ? index : profiles.length) % PROFILE_COLOR_COUNT,
  };
}

/**
 * Label each connected host's profile, keyed by host key. Returns no labels
 * for a single host: there is nothing to tell apart, so tabs keep the plain
 * window tag. A host that can't say which profile it serves is labelled by
 * its Firefox process.
 */
export function labelHosts(
  hosts: Array<{ key: string; profilePath: string | null; firefoxPid: number | null; port: number }>,
  profiles: FirefoxProfile[]
): Map<string, ProfileLabel> {
  const unique = [...new Map(hosts.map((h) => [h.key, h])).values()];
  const labels = new Map<string, ProfileLabel>();
  if (unique.length < 2) return labels;
  for (const host of unique) {
    labels.set(
      host.key,
      labelProfile(host.profilePath, profiles) ?? {
        name: `Firefox (process ${host.firefoxPid ?? host.port})`,
        icon: { name: DEFAULT_AVATAR_ICON },
        colorIndex: labels.size % PROFILE_COLOR_COUNT,
      }
    );
  }
  return labels;
}
