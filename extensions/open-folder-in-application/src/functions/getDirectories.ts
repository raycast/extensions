import * as fs from "fs";
import path from "path";
import { getFilteredDirectories } from "./getFilteredDirectories";

export const getDirectories = (dir: string, excludedFolders: string[], excludedSystemFolders: string[]): string[] => {
  const filteredDirectories = getFilteredDirectories(dir, excludedSystemFolders);

  return filteredDirectories.reduce<string[]>((acc, file) => {
    const filePath = path.join(dir, file);

    try {
      const stat = fs.statSync(filePath);

      if (
        stat.isDirectory() &&
        !excludedFolders.some(
          (excludedFolder) =>
            filePath.includes(path.sep + excludedFolder + path.sep) ||
            filePath.endsWith(path.sep + excludedFolder) ||
            filePath.endsWith(".app"),
        ) &&
        !file.startsWith(".")
      ) {
        return acc.concat(filePath, getDirectories(filePath, excludedFolders, excludedSystemFolders));
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error(`Error accessing ${filePath}: ${error.message}`);
    }

    return acc;
  }, []);
};
