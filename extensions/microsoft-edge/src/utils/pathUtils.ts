import path from "path";
import { DEFAULT_PROFILE_ID } from "../constants";
import { getApplicationName } from "./appUtils";

const PATH_PREFIX = "Application Support";

export const getDefaultEdgeProfilePath = () => [PATH_PREFIX, getApplicationName()];

export const getDefaultEdgeStatePath = () => [PATH_PREFIX, getApplicationName(), "Local State"];

const userLibraryDirectoryPath = () => {
  if (!process.env.HOME) {
    throw new Error("$HOME environment variable is not set.");
  }

  return path.join(process.env.HOME, "Library");
};

export const getHistoryDbPath = (profile?: string) =>
  path.join(userLibraryDirectoryPath(), ...getDefaultEdgeProfilePath(), profile ?? DEFAULT_PROFILE_ID, "History");

/**
 * @returns Path to the Local State file which contains all the profile information
 */
export const getLocalStatePath = () => path.join(userLibraryDirectoryPath(), ...getDefaultEdgeStatePath());

export const getBookmarksFilePath = (profile?: string) =>
  path.join(userLibraryDirectoryPath(), ...getDefaultEdgeProfilePath(), profile ?? DEFAULT_PROFILE_ID, "Bookmarks");

export const getCollectionsDbPath = (profile?: string) =>
  path.join(
    userLibraryDirectoryPath(),
    ...getDefaultEdgeProfilePath(),
    profile ?? DEFAULT_PROFILE_ID,
    "Collections",
    "collectionsSQLite",
  );
