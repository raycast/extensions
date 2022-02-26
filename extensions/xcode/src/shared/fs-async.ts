import fs from "fs";
import { PathLike } from "node:fs";

/**
 * Exists
 */
export const existsAsync = (path: PathLike) => {
  return fs.promises
    .access(path, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);
};

/**
 * Read directory
 */
export const readDirectoryAsync = fs.promises.readdir;

/**
 * Make directory
 */
export const makeDirectoryAsync = fs.promises.mkdir;

/**
 * Remove directory
 */
export const removeDirectoryAsync = fs.promises.rm;

/**
 * Write file
 */
export const writeFileAsync = fs.promises.writeFile;
