import fs from "fs";
import os from "os";
import path from "path";
import { getPreferenceValues } from "@raycast/api";

const userDataDirectoryPath = () => {
  if (process.platform === "win32") {
    const appData = process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, "Mozilla", "Firefox", "Profiles");
  }

  if (!process.env.HOME) {
    throw new Error("$HOME environment variable is not set.");
  }

  return path.join(process.env.HOME, "Library", "Application Support", "Firefox", "Profiles");
};

const NON_PROFILE_ENTRIES = new Set(["Crash Reports", "Pending Pings", "installs.ini", "profiles.ini"]);

const VARIANT_SPECIFIC_SUFFIXES = [".default-release", ".default-nightly", ".default-esr", ".dev-edition-default"];

const DEFAULT_PROFILE_SUFFIX = "default-release";

const getProfileName = (userDirectoryPath: string) => {
  let profiles: string[];
  try {
    profiles = fs.readdirSync(userDirectoryPath);
  } catch {
    return "";
  }

  const preferences = getPreferenceValues<Preferences>();

  const suffix = preferences.profileDirectorySuffix;
  if (suffix && suffix !== DEFAULT_PROFILE_SUFFIX) {
    const customProfile = profiles.find((profile) => profile.endsWith(suffix));
    if (customProfile) return customProfile;
  }

  const releaseProfile = profiles.find((profile) => profile.endsWith(".default-release"));
  const nightlyProfile = profiles.find((profile) => profile.endsWith(".default-nightly"));
  const esrProfile = profiles.find((profile) => profile.endsWith(".default-esr"));
  const devProfile = profiles.find((profile) => profile.endsWith(".dev-edition-default"));
  const defaultProfile = profiles.find((profile) => profile.endsWith(".default"));

  const browserApp = preferences.browserApp;
  if (browserApp === "Firefox Nightly" && nightlyProfile) return nightlyProfile;
  if (browserApp === "Firefox ESR" && esrProfile) return esrProfile;
  if (browserApp === "Firefox Developer Edition" && devProfile) return devProfile;

  const isNonReleaseVariant =
    browserApp === "Firefox Nightly" || browserApp === "Firefox ESR" || browserApp === "Firefox Developer Edition";
  const variantProfile = isNonReleaseVariant
    ? undefined
    : (releaseProfile ?? nightlyProfile ?? esrProfile ?? devProfile ?? defaultProfile);
  if (variantProfile) return variantProfile;

  const fallback = profiles
    .filter((entry) => !NON_PROFILE_ENTRIES.has(entry))
    .filter((entry) => {
      if (isNonReleaseVariant && VARIANT_SPECIFIC_SUFFIXES.some((s) => entry.endsWith(s))) return false;
      if (isNonReleaseVariant && entry.endsWith(".default")) return false;
      return true;
    })
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

export const getSessionManagerExtensionPath = (extensionId: string) => {
  const userDirectoryPath = userDataDirectoryPath();
  return path.join(
    userDirectoryPath,
    getProfileName(userDirectoryPath),
    "storage",
    "default",
    `moz-extension+++${extensionId}`,
    "idb",
  );
};

export const getSessionInactivePath = (): string => {
  const userDirectoryPath = userDataDirectoryPath();
  return path.join(userDirectoryPath, getProfileName(userDirectoryPath), "sessionstore.jsonlz4");
};

export const getSessionActivePath = (): string => {
  const userDirectoryPath = userDataDirectoryPath();
  return path.join(userDirectoryPath, getProfileName(userDirectoryPath), "sessionstore-backups", "recovery.jsonlz4");
};

// Escape ' for SQL and the LIKE wildcards % and _ (plus the escape char itself) so they match literally.
const escapeLike = (term: string) => term.replace(/'/g, "''").replace(/[\\%_]/g, "\\$&");

export const searchWhereClause = (query: string | undefined, titleColumn: string, urlColumn: string): string => {
  const terms = query?.trim().split(/\s+/).filter(Boolean) ?? [];
  return terms
    .map(
      (t) =>
        `AND (${titleColumn} LIKE '%${escapeLike(t)}%' ESCAPE '\\' OR ${urlColumn} LIKE '%${escapeLike(t)}%' ESCAPE '\\')`,
    )
    .join(" ");
};
