import { readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { BrowserConfig, GoogleChromeLocalState, GoogleChromeInfoCache, Profile } from "./types";

export function extractProfiles(infoCache: GoogleChromeInfoCache): Profile[] {
  return Object.entries(infoCache)
    .map(
      ([directory, profile]): Profile => ({
        directory,
        name: profile.name,
        givenName: profile.gaia_given_name,
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
