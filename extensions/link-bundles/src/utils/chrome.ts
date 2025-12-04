import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { getPreferenceValues } from "@raycast/api";
import { Bundle } from "../types";
import { decodeUrlSafely } from "./url";

const execAsync = promisify(exec);
const preferences: Preferences = getPreferenceValues();

interface ChromeProfile {
  name: string;
  directory: string;
  isDefault: boolean;
}

let profilesCache: ChromeProfile[] | null = null;
let profilesByDirCache: Map<string, ChromeProfile> | null = null;
let lastCacheUpdate = 0;
const CACHE_TTL = 5 * 60 * 1000;

const createProfilesCache = (profiles: ChromeProfile[]) => {
  profilesCache = profiles;
  profilesByDirCache = new Map(profiles.map((profile) => [profile.directory, profile]));
  lastCacheUpdate = Date.now();
};

export const getChromeProfiles = (): ChromeProfile[] => {
  if (profilesCache && Date.now() - lastCacheUpdate < CACHE_TTL) {
    return profilesCache;
  }

  try {
    const localStatePath = path.join(preferences.chromeProfilesDirectory, "Local State");
    const localState = JSON.parse(fs.readFileSync(localStatePath, "utf8")) as {
      profile: {
        info_cache: Record<string, { name: string }>;
      };
    };
    const profiles = Object.entries(localState.profile.info_cache).map(([dir, { name }]) => ({
      name,
      directory: dir,
      isDefault: dir === "Default",
    }));

    createProfilesCache(profiles);
    return profiles;
  } catch (error) {
    console.error("Failed to read Chrome profiles:", error);
    const defaultProfile = {
      name: "Default Profile",
      directory: "Default",
      isDefault: true,
    };
    createProfilesCache([defaultProfile]);
    return [defaultProfile];
  }
};

const getProfileByDirectory = (directory: string): ChromeProfile | undefined => {
  if (!profilesByDirCache || Date.now() - lastCacheUpdate >= CACHE_TTL) {
    getChromeProfiles();
  }

  return profilesByDirCache?.get(directory);
};

export const getProfileNameByDirectory = (directory: string): string => {
  const profile = getProfileByDirectory(directory);
  return profile?.name || "Default Profile";
};

export const openLinksInChrome = async (bundle: Bundle): Promise<void> => {
  if (bundle.links.length === 0) return;

  const chromePath = path.join(preferences.chromeApplicationDirectory, "Google Chrome.app");
  const decodedLinks = bundle.links.map(decodeUrlSafely);
  const urls = decodedLinks.map((link) => `"${encodeURI(link)}"`).join(" ");

  const args = [];

  if (bundle.openInNewWindow) {
    args.push("--new-window");
  }

  if (bundle.openInIncognitoWindow) {
    args.push("--incognito");
  } else {
    const chromeProfileDirectory = getProfileByDirectory(bundle.chromeProfileDirectory)?.directory || "Default";
    args.push(`--profile-directory="${chromeProfileDirectory}"`);
  }

  args.push(urls);

  const command = `open -na "${chromePath}" --args ${args.join(" ")}`;

  try {
    await execAsync(command);
  } catch (error) {
    throw new Error(`Failed to open Chrome: ${error}`);
  }
};
