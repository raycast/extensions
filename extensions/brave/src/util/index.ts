import path from "path";
import { defaultBraveProfilePath } from "../constants";

const userLibraryDirectoryPath = () => {
  if (!process.env.HOME) {
    throw new Error("$HOME environment variable is not set.");
  }

  return path.join(process.env.HOME, "Library");
};

export const getHistoryDbPath = () => path.join(userLibraryDirectoryPath(), ...defaultBraveProfilePath, "History");

export const getBookmarksFilePath = () =>
  path.join(userLibraryDirectoryPath(), ...defaultBraveProfilePath, "Bookmarks");
