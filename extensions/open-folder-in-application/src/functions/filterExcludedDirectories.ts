import path from "path";

export const filterExcludedDirectories = (list: string[], dir: string, excludedSystemFolders: string[]): string[] => {
  return list.filter((file) => {
    const filePath = path.join(dir, file);

    return !excludedSystemFolders.some((excludedFolder) => filePath.startsWith(excludedFolder));
  });
};
