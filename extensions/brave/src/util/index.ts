import path from "path";
import { DEFAULT_BRAVE_PROFILE_ID, defaultBraveProfilePath, defaultBraveStatePath } from "../constants";

const userLibraryDirectoryPath = () => {
  if (!process.env.HOME) {
    throw new Error("$HOME environment variable is not set.");
  }

  return path.join(process.env.HOME, "Library");
};

export const getHistoryDbPath = (profile?: string) =>
  path.join(userLibraryDirectoryPath(), ...defaultBraveProfilePath, profile ?? DEFAULT_BRAVE_PROFILE_ID, "History");

export const getLocalStatePath = () => path.join(userLibraryDirectoryPath(), ...defaultBraveStatePath);

export const getBookmarksFilePath = (profile?: string) =>
  path.join(userLibraryDirectoryPath(), ...defaultBraveProfilePath, profile ?? DEFAULT_BRAVE_PROFILE_ID, "Bookmarks");
