import fs from "fs";
import path from "path";
import { getPreferenceValues } from "@raycast/api";

const userDataDirectoryPath = (): string => {
  const appData = process.env.APPDATA;
  if (appData) {
    return path.join(appData, "Mozilla", "Firefox", "Profiles");
  }

  const userProfile = process.env.USERPROFILE || process.env.HOME;
  if (userProfile) {
    return path.join(userProfile, "AppData", "Roaming", "Mozilla", "Firefox", "Profiles");
  }

  throw new Error(
    "Could not determine Firefox profile directory. Neither APPDATA nor USERPROFILE environment variable is set.",
  );
};

const NON_PROFILE_ENTRIES = new Set(["Crash Reports", "Pending Pings", "installs.ini", "profiles.ini"]);

export const getProfileName = (userDirectoryPath: string): string => {
  let profiles: string[];
  try {
    profiles = fs.readdirSync(userDirectoryPath);
  } catch {
    return "";
  }

  const bySuffix = (suffix: string) => profiles.find((profile) => profile.endsWith(suffix));

  const { profileDirectorySuffix } = getPreferenceValues<Preferences>();
  const customSuffix = profileDirectorySuffix?.trim();
  const customProfile = customSuffix ? bySuffix(customSuffix) : undefined;
  if (customProfile) {
    return customProfile;
  }

  const knownProfile =
    bySuffix(".default-release") ?? bySuffix(".default-nightly") ?? bySuffix(".default-esr") ?? bySuffix(".default");
  if (knownProfile) {
    return knownProfile;
  }

  const fallback = profiles
    .filter((entry) => !NON_PROFILE_ENTRIES.has(entry))
    .filter((entry) => {
      try {
        return fs.statSync(path.join(userDirectoryPath, entry)).isDirectory();
      } catch {
        return false;
      }
    })
    .sort();

  return fallback[0] ?? "";
};

export const getHistoryDbPath = (): string => {
  const userDirectoryPath = userDataDirectoryPath();
  return path.join(userDirectoryPath, getProfileName(userDirectoryPath), "places.sqlite");
};

const escapeSql = (term: string) => term.replace(/'/g, "''");

export const searchWhereClause = (query: string | undefined, titleColumn: string, urlColumn: string): string => {
  const terms = query?.trim().split(/\s+/).filter(Boolean) ?? [];
  return terms
    .map((t) => `AND (${titleColumn} LIKE '%${escapeSql(t)}%' OR ${urlColumn} LIKE '%${escapeSql(t)}%')`)
    .join(" ");
};
