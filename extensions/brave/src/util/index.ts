import path from "path";
import {
  DEFAULT_BRAVE_PROFILE_ID,
  defaultBraveProfilePath,
  defaultBraveBetaProfilePath,
  defaultBraveNightlyProfilePath,
  defaultBraveStatePath,
} from "../constants";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../interfaces";

const { browserOption } = getPreferenceValues<Preferences>();

let prefProfile: string[];

switch (browserOption) {
  case "Brave Browser Beta":
    prefProfile = defaultBraveBetaProfilePath;
    break;
  case "Brave Browser Nightly":
    prefProfile = defaultBraveNightlyProfilePath;
    break;
  default:
    prefProfile = defaultBraveProfilePath;
}

const userLibraryDirectoryPath = () => {
  if (!process.env.HOME) {
    throw new Error("$HOME environment variable is not set.");
  }

  return path.join(process.env.HOME, "Library");
};

export const getHistoryDbPath = (profile?: string) =>
  path.join(userLibraryDirectoryPath(), ...prefProfile, profile ?? DEFAULT_BRAVE_PROFILE_ID, "History");

export const getLocalStatePath = () => path.join(userLibraryDirectoryPath(), ...defaultBraveStatePath);

export const getBookmarksFilePath = (profile?: string) =>
  path.join(userLibraryDirectoryPath(), ...prefProfile, profile ?? DEFAULT_BRAVE_PROFILE_ID, "Bookmarks");
