import { getPreferenceValues, Icon, Image } from "@raycast/api";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CHROME_DIR } from "./blocklist";

// The profile Chrome last used, which is also where `--app` windows open.
export function currentProfile(): string {
  try {
    return JSON.parse(readFileSync(join(CHROME_DIR, "Local State"), "utf8")).profile?.last_used || "Default";
  } catch {
    return "Default";
  }
}

// The name shown in Chrome's profile menu, falling back to the profile directory name.
export function profileName(profile: string): string {
  try {
    return (
      JSON.parse(readFileSync(join(CHROME_DIR, "Local State"), "utf8")).profile?.info_cache?.[profile]?.name || profile
    );
  } catch {
    return profile;
  }
}

type ProfileInfo = {
  name?: string;
  gaia_picture_file_name?: string;
  profile_highlight_color?: number;
  default_avatar_fill_color?: number;
};

export type ChromeProfile = { dir: string; name: string; icon: Image.ImageLike };

// The account picture, or a circle in the profile's theme colour.
function profileIcon(dir: string, info: ProfileInfo): Image.ImageLike {
  const picture = info.gaia_picture_file_name && join(CHROME_DIR, dir, info.gaia_picture_file_name);
  if (picture && existsSync(picture)) return { source: picture, mask: Image.Mask.Circle };
  const color = info.profile_highlight_color ?? info.default_avatar_fill_color;
  if (typeof color !== "number") return Icon.PersonCircle;
  return { source: Icon.CircleFilled, tintColor: `#${((color >>> 0) & 0xffffff).toString(16).padStart(6, "0")}` };
}

// Profiles listed in Chrome's profile menu, sorted by name.
export function chromeProfiles(): ChromeProfile[] {
  try {
    const info: Record<string, ProfileInfo> =
      JSON.parse(readFileSync(join(CHROME_DIR, "Local State"), "utf8")).profile?.info_cache ?? {};
    return Object.entries(info)
      .map(([dir, p]) => ({ dir, name: p.name || dir, icon: profileIcon(dir, p) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

// Finds a profile directory by its directory name, then by its name, ignoring case.
export function findProfile(query: string): string | undefined {
  const q = query.trim().toLowerCase();
  const profiles = chromeProfiles();
  return (profiles.find((p) => p.dir.toLowerCase() === q) || profiles.find((p) => p.name.toLowerCase() === q))?.dir;
}

// The profile set in the preferences, if any.
export function preferredProfile(): string | undefined {
  return getPreferenceValues<Preferences>().profile?.trim() || undefined;
}

// The profile from the preferences, the last used one when it is empty, or undefined when it is unknown.
export function defaultProfile(): string | undefined {
  const query = preferredProfile();
  return query ? findProfile(query) : currentProfile();
}

// The profile matching the query, or the default one when the query is empty.
export function resolveProfile(query?: string): string | undefined {
  return query?.trim() ? findProfile(query) : defaultProfile();
}
