import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { Browser, Profile } from "./types";

interface LocalStateInfoCache {
  [profileDir: string]: {
    name?: string;
    shortcut_name?: string;
    gaia_name?: string;
    avatar_icon?: string;
  };
}

interface LocalState {
  profile?: {
    info_cache?: LocalStateInfoCache;
  };
}

function parseLocalState(filePath: string): LocalState | null {
  try {
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as LocalState;
  } catch {
    return null;
  }
}

function findAvatarPath(
  profileRootPath: string,
  directoryName: string,
): string | null {
  const profileDir = join(profileRootPath, directoryName);
  const googlePicture = join(profileDir, "Google Profile Picture.png");
  if (existsSync(googlePicture)) {
    return googlePicture;
  }
  return null;
}

export function scanBrowserProfiles(browser: Browser): Profile[] {
  if (!existsSync(browser.applicationPath)) {
    return [];
  }

  const localStatePath = join(browser.profileRootPath, "Local State");
  const localState = parseLocalState(localStatePath);

  if (!localState?.profile?.info_cache) {
    // Fallback: check if Default profile directory exists
    const defaultDir = join(browser.profileRootPath, "Default");
    if (existsSync(defaultDir)) {
      return [
        {
          id: `${browser.id}:Default`,
          browserId: browser.id,
          directoryName: "Default",
          displayName: "Default",
          avatarPath: findAvatarPath(browser.profileRootPath, "Default"),
          gaiaName: null,
        },
      ];
    }
    return [];
  }

  const infoCache = localState.profile.info_cache;
  const profiles: Profile[] = [];

  for (const [directoryName, meta] of Object.entries(infoCache)) {
    const profileDir = join(browser.profileRootPath, directoryName);
    if (!existsSync(profileDir)) {
      continue;
    }

    profiles.push({
      id: `${browser.id}:${directoryName}`,
      browserId: browser.id,
      directoryName,
      displayName: meta.name || meta.shortcut_name || directoryName,
      avatarPath: findAvatarPath(browser.profileRootPath, directoryName),
      gaiaName: meta.gaia_name || null,
    });
  }

  return profiles;
}

export async function scanAllProfiles(browsers: Browser[]): Promise<Profile[]> {
  const allProfiles: Profile[] = [];

  for (const browser of browsers) {
    try {
      const profiles = scanBrowserProfiles(browser);
      allProfiles.push(...profiles);
    } catch {
      // Gracefully skip browsers with errors (FR-010)
      console.warn(`Failed to scan profiles for ${browser.name}`);
    }
  }

  return allProfiles;
}
