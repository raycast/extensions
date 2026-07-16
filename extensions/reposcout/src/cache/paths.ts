import { join } from "node:path";

/**
 * Resolves the on-disk locations of RepoScout's cache files inside Raycast's
 * per-extension support directory. Isolated so tests and the UI agree on the
 * filenames without importing the Raycast environment.
 */

/** Filename of the repository index cache. */
export const INDEX_FILENAME = "repository-index.json";

/** Filename of the per-repository user-data store. */
export const USER_DATA_FILENAME = "user-data.json";

/** Absolute path to the repository index cache. */
export function indexFilePath(supportPath: string): string {
  return join(supportPath, INDEX_FILENAME);
}

/** Absolute path to the user-data store. */
export function userDataFilePath(supportPath: string): string {
  return join(supportPath, USER_DATA_FILENAME);
}
