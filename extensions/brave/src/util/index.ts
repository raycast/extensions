import path from "path";
import { homedir } from "os";
import { isWindows, getWindowsUserDataPath } from "./platform";
import {
  DEFAULT_BRAVE_PROFILE_ID,
  defaultBraveProfilePath,
  defaultBraveBetaProfilePath,
  defaultBraveNightlyProfilePath,
} from "../constants";
import { getPreferenceValues } from "@raycast/api";

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
  return path.join(homedir(), "Library");
};

export const getHistoryDbPath = (profile?: string) =>
  path.join(
    isWindows ? getWindowsUserDataPath() : path.join(userLibraryDirectoryPath(), ...prefProfile),
    profile ?? DEFAULT_BRAVE_PROFILE_ID,
    "History",
  );

export const getLocalStatePath = () =>
  path.join(
    isWindows ? getWindowsUserDataPath() : path.join(userLibraryDirectoryPath(), ...prefProfile),
    "Local State",
  );

export const getBookmarksFilePath = (profile?: string) =>
  path.join(
    isWindows ? getWindowsUserDataPath() : path.join(userLibraryDirectoryPath(), ...prefProfile),
    profile ?? DEFAULT_BRAVE_PROFILE_ID,
    "Bookmarks",
  );
