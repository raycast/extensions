import path from "path";
import { DEFAULT_CHROME_PROFILE_ID, defaultChromeProfilePath, defaultChromeStatePath } from "../constants";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../interfaces";

const userLibraryDirectoryPath = () => {
  if (!process.env.HOME) {
    throw new Error("$HOME environment variable is not set.");
  }

  return path.join(process.env.HOME, "Library");
};
const getChromeFilePath = (fileName: string, profile?: string) => {
  const { profilePath } = getPreferenceValues<Preferences>();
  if (profilePath) {
    return path.join(profilePath, fileName);
  }
  return path.join(
    userLibraryDirectoryPath(),
    ...defaultChromeProfilePath,
    profile ?? DEFAULT_CHROME_PROFILE_ID,
    fileName
  );
};

export const getHistoryDbPath = (profile?: string) => getChromeFilePath("History", profile);

export const getLocalStatePath = () => path.join(userLibraryDirectoryPath(), ...defaultChromeStatePath);

export const getBookmarksFilePath = (profile?: string) => getChromeFilePath("Bookmarks", profile);
