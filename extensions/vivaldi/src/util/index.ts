import path from "path";
import { DEFAULT_VIVALDI_PROFILE_ID, defaultVivaldiStatePath, defaultVivaldiProfilePath } from "../constants";

const userLibraryDirectoryPath = () => {
  if (!process.env.HOME) {
    throw new Error("$HOME environment variable is not set.");
  }

  return path.join(process.env.HOME, "Library");
};

export const getHistoryDbPath = (profile?: string) =>
  path.join(userLibraryDirectoryPath(), ...defaultVivaldiProfilePath, profile ?? DEFAULT_VIVALDI_PROFILE_ID, "History");

export const getLocalStatePath = () => path.join(userLibraryDirectoryPath(), ...defaultVivaldiStatePath);

export const getBookmarksFilePath = (profile?: string) =>
  path.join(
    userLibraryDirectoryPath(),
    ...defaultVivaldiProfilePath,
    profile ?? DEFAULT_VIVALDI_PROFILE_ID,
    "Bookmarks"
  );
