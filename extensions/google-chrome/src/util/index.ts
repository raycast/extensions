import path from "path";
import { DEFAULT_CHROME_PROFILE_ID, defaultChromeProfilePath, defaultChromeStatePath } from "../constants";

const userLibraryDirectoryPath = () => {
  if (!process.env.HOME) {
    throw new Error("$HOME environment variable is not set.");
  }

  return path.join(process.env.HOME, "Library");
};

export const getHistoryDbPath = (profile?: string) =>
  path.join(userLibraryDirectoryPath(), ...defaultChromeProfilePath, profile ?? DEFAULT_CHROME_PROFILE_ID, "History");

export const getLocalStatePath = () => path.join(userLibraryDirectoryPath(), ...defaultChromeStatePath);

export const getBookmarksFilePath = (profile?: string) =>
  path.join(userLibraryDirectoryPath(), ...defaultChromeProfilePath, profile ?? DEFAULT_CHROME_PROFILE_ID, "Bookmarks");
