import path from "path";
import { defaultIridiumProfilePath } from "../constants";

const userLibraryDirectoryPath = () => {
  if (!process.env.HOME) {
    throw new Error("$HOME environment variable is not set.");
  }

  return path.join(process.env.HOME, "Library");
};

export const getHistoryDbPath = () => path.join(userLibraryDirectoryPath(), ...defaultIridiumProfilePath, "History");

export const getBookmarksFilePath = () =>
  path.join(userLibraryDirectoryPath(), ...defaultIridiumProfilePath, "Bookmarks");
