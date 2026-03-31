/**
 * Directory scanning utilities.
 */

import { readdir } from "fs/promises";
import { join } from "path";

/**
 * Scan a directory for files (non-directory entries) at the top level only.
 * Skips hidden files (starting with '.') and subdirectories.
 */
export async function scanDirectoryForFiles(dirPath: string): Promise<string[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const filePaths: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    if (entry.isDirectory()) continue;

    filePaths.push(join(dirPath, entry.name));
  }

  return filePaths;
}

/**
 * Recursively scan a directory for files, walking all subdirectories.
 * Skips hidden files and hidden directories (starting with '.').
 */
export async function scanDirectoryRecursive(dirPath: string): Promise<string[]> {
  const filePaths: string[] = [];
  const entries = await readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = join(dirPath, entry.name);

    if (entry.isDirectory()) {
      const nested = await scanDirectoryRecursive(fullPath);
      filePaths.push(...nested);
    } else {
      filePaths.push(fullPath);
    }
  }

  return filePaths;
}
