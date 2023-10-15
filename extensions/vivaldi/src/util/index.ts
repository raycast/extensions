import path from "path";
import { defaultVivaldiProfilePath } from "../constants";

const userLibraryDirectoryPath = () => {
  if (!process.env.HOME) {
    throw new Error("$HOME environment variable is not set.");
  }

  return path.join(process.env.HOME, "Library");
};

export const getHistoryDbPath = () => path.join(userLibraryDirectoryPath(), ...defaultVivaldiProfilePath, "History");

export const getBookmarksFilePath = () =>
  path.join(userLibraryDirectoryPath(), ...defaultVivaldiProfilePath, "Bookmarks");
