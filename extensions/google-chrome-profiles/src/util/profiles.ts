import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { BrowserConfig, GoogleChromeLocalState, GoogleChromeInfoCache, Profile } from "./types";

export function extractProfiles(infoCache: GoogleChromeInfoCache): Profile[] {
  const byName = Object.entries(infoCache)
    .map(
      ([directory, profile]): Profile => ({
        directory,
        name: profile.name,
        givenName: profile.gaia_given_name,
        activeTime: profile.active_time,
        ...(profile.user_name && {
          ga: {
            name: profile.gaia_name || profile.gaia_given_name || profile.name,
            email: profile.user_name,
            pictureURL: profile.last_downloaded_gaia_picture_url_with_size,
          },
        }),
      }),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  return getPreferenceValues<ExtensionPreferences>().sortProfiles === "lastUsed" ? sortByLastUsed(byName) : byName;
}

export function profileLabels(profile: Profile): string[] {
  return [...new Set([...(profile.givenName ? [`${profile.givenName} (${profile.name})`] : []), profile.name])];
}

export function filterProfiles(profiles: Profile[], query: string): Profile[] {
  const words = query.toLocaleLowerCase().trim().split(/\s+/);
  return profiles.filter((profile) => {
    const text = [profile.name, profile.givenName, profile.ga?.name, profile.ga?.email].join(" ").toLocaleLowerCase();
    return words.every((word) => text.includes(word));
  });
}

export const readChromeLocalState = async (browser: BrowserConfig) => {
  const path = join(homedir(), browser.dataPath, "Local State");
  const text = await readFile(path, "utf8");
  return { path, text, state: JSON.parse(text) as GoogleChromeLocalState };
};

export function sortByLastUsed(profiles: Profile[]): Profile[] {
  return [...profiles].sort((a, b) => (b.activeTime ?? 0) - (a.activeTime ?? 0));
}

// Profile names can change; directory names can overlap between browsers.
const hiddenProfilesKey = (browser: BrowserConfig) => `hiddenProfiles:${browser.dataPath}`;

export function parseHiddenDirectories(value: string | undefined): string[] {
  try {
    const directories: unknown = JSON.parse(value ?? "[]");
    return Array.isArray(directories) ? directories.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export async function loadHiddenDirectories(browser: BrowserConfig): Promise<string[]> {
  return parseHiddenDirectories(await LocalStorage.getItem<string>(hiddenProfilesKey(browser)));
}

export async function saveHiddenDirectories(
  browser: BrowserConfig,
  directories: string[],
  profiles: Profile[],
): Promise<string[]> {
  const existing = new Set(profiles.map((profile) => profile.directory));
  const saved = [...new Set(directories)].filter((directory) => existing.has(directory));
  await LocalStorage.setItem(hiddenProfilesKey(browser), JSON.stringify(saved));
  return saved;
}

export function moveDestinations(
  profiles: Profile[],
  sourceDirectory: string | undefined,
  hiddenDirectories: string[],
): Profile[] {
  return profiles.filter(
    (profile) => profile.directory !== sourceDirectory && !hiddenDirectories.includes(profile.directory),
  );
}
