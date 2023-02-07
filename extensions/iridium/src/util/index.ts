import path from "path";
import { DEFAULT_IRIDIUM_PROFILE_ID, defaultIridiumStatePath, defaultIridiumProfilePath } from "../constants";

const userLibraryDirectoryPath = () => {
  if (!process.env.HOME) {
    throw new Error("$HOME environment variable is not set.");
  }

  return path.join(process.env.HOME, "Library");
};

export const getHistoryDbPath = (profile?: string) =>
  path.join(userLibraryDirectoryPath(), ...defaultIridiumProfilePath, profile ?? DEFAULT_IRIDIUM_PROFILE_ID, "History");

export const getLocalStatePath = () => path.join(userLibraryDirectoryPath(), ...defaultIridiumStatePath);

export const getBookmarksFilePath = (profile?: string) =>
  path.join(
    userLibraryDirectoryPath(),
    ...defaultIridiumProfilePath,
    profile ?? DEFAULT_IRIDIUM_PROFILE_ID,
    "Bookmarks"
  );
