import path from "node:path";

/**
 * Given a current folder path, this function will return a parent folder path of current one.
 */
export function getParentFolder(currentFolderPath: string) {
  if (currentFolderPath === "/") {
    return currentFolderPath;
  }

  const parentFolderPath = path.resolve(currentFolderPath, "..");
  return parentFolderPath;
}
