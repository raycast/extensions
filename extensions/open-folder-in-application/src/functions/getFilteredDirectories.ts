import { filterExcludedDirectories } from "./filterExcludedDirectories";
import { readDirWithCache } from "./readDirWithCache";

export const getFilteredDirectories = (dir: string, excludedSystemFolders: string[]): string[] => {
  try {
    const list = readDirWithCache(dir);

    return filterExcludedDirectories(list, dir, excludedSystemFolders);
  } catch (error) {
    return [];
  }
};
