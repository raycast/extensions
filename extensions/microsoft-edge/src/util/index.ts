import path from "path";
import { DEFAULT_EDGE_PROFILE_ID, defaultEdgeProfilePath, defaultEdgeStatePath } from "../constants";

const userLibraryDirectoryPath = () => {
  if (!process.env.HOME) {
    throw new Error("$HOME environment variable is not set.");
  }

  return path.join(process.env.HOME, "Library");
};

export const getHistoryDbPath = (profile?: string) =>
  path.join(userLibraryDirectoryPath(), ...defaultEdgeProfilePath, profile ?? DEFAULT_EDGE_PROFILE_ID, "History");

export const getLocalStatePath = () => path.join(userLibraryDirectoryPath(), ...defaultEdgeStatePath);

export const getBookmarksFilePath = (profile?: string) =>
  path.join(userLibraryDirectoryPath(), ...defaultEdgeProfilePath, profile ?? DEFAULT_EDGE_PROFILE_ID, "Bookmarks");

export const getCollectionsDbPath = (profile?: string) =>
  path.join(
    userLibraryDirectoryPath(),
    ...defaultEdgeProfilePath,
    profile ?? DEFAULT_EDGE_PROFILE_ID,
    "Collections",
    "collectionsSQLite"
  );
