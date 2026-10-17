import { readdir } from "node:fs/promises";
import path from "node:path";

export async function findFilesByName(
  rootPath: string,
  fileName: string,
  limit = 2,
): Promise<string[]> {
  if (path.basename(fileName) !== fileName) {
    throw new Error("The browser returned an invalid file name");
  }

  const matches: string[] = [];
  const directories = [rootPath];

  for (
    let index = 0;
    index < directories.length && matches.length < limit;
    index += 1
  ) {
    const directoryPath = directories[index];

    const entries = await readdir(directoryPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) directories.push(entryPath);
      else if (entry.isFile() && entry.name === fileName) {
        matches.push(entryPath);
        if (matches.length === limit) break;
      }
    }
  }

  return matches;
}
