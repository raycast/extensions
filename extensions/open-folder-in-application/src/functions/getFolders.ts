import { getDirectories } from "./getDirectories";

export const getFolders = async (
  dir: string,
  excludedFolders: string[],
  excludedSystemFolders: string[],
): Promise<string[]> => {
  return getDirectories(dir, excludedFolders, excludedSystemFolders);
};
