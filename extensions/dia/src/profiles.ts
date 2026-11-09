import { readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

const USER_DATA_PATH = join(homedir(), "Library/Application Support/Dia/User Data");

type LocalState = {
  profile?: {
    profiles_order?: string[];
    info_cache?: Record<string, { name?: string; profile_color_seed?: number }>;
  };
};

type PreferencesFile = {
  browser?: { theme?: { user_color2?: number } };
};

export async function readJSON<T>(path: string): Promise<T | undefined> {
  try {
    const content = await readFile(path, "utf-8");
    return JSON.parse(content.replace(/^\uFEFF/, "")) as T;
  } catch {
    return undefined;
  }
}

/** Chromium stores colors as signed 32-bit ARGB integers. */
function toHexColor(argb: number | undefined): string | undefined {
  if (typeof argb !== "number" || !Number.isFinite(argb)) return undefined;
  return `#${((argb >>> 0) & 0xffffff).toString(16).padStart(6, "0")}`;
}

export type Profile = {
  /** Profile folder inside Dia's User Data, such as `Default` or `Profile 2`. */
  directory: string;
  path: string;
  name: string;
  /** Theme color as `#rrggbb`. */
  color?: string;
};

/**
 * Lists Dia's profiles (spaces) in Local State's `profiles_order`, read-only from Dia's Chromium data.
 * The color comes from the profile's `browser.theme.user_color2` preference, falling back to the
 * `profile_color_seed` in Local State. Returns an empty list when the data is missing or unreadable.
 */
export async function getProfiles(): Promise<Profile[]> {
  const localState = await readJSON<LocalState>(join(USER_DATA_PATH, "Local State"));
  const infoCache = localState?.profile?.info_cache ?? {};
  const order = localState?.profile?.profiles_order ?? [];
  const directories = [...new Set([...order.filter((dir) => dir in infoCache), ...Object.keys(infoCache)])];

  return Promise.all(
    directories.map(async (directory) => {
      const info = infoCache[directory];
      const path = join(USER_DATA_PATH, directory);
      const preferences = await readJSON<PreferencesFile>(join(path, "Preferences"));
      return {
        directory,
        path,
        name: info.name || directory,
        color: toHexColor(preferences?.browser?.theme?.user_color2) ?? toHexColor(info.profile_color_seed),
      };
    }),
  );
}

/**
 * Maps each Dia profile (space) name to its theme color as `#rrggbb`.
 * When two profiles share a name, the first in `profiles_order` wins.
 */
export async function getProfileColors(): Promise<Record<string, string>> {
  const colors: Record<string, string> = {};
  for (const { name, color } of await getProfiles()) {
    if (color && !(name in colors)) colors[name] = color;
  }
  return colors;
}
