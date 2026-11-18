import path from "node:path";
import { readdir, realpath, stat } from "node:fs/promises";

import type { ChildDirectory } from "./types";
import { expandHome } from "./paths";

export interface DirectorySearchOptions {
  maxDepth: number;
}

export async function listChildDirectories(
  parentDirectory: string,
  options: DirectorySearchOptions,
): Promise<ChildDirectory[]> {
  const resolvedPath = expandHome(parentDirectory);
  const directories: ChildDirectory[] = [];
  const visitedPaths = new Set<string>();

  await collectGitRepositories(resolvedPath, options.maxDepth, directories, visitedPaths);

  return directories;
}

async function collectGitRepositories(
  directory: string,
  remainingDepth: number,
  directories: ChildDirectory[],
  visitedPaths: Set<string>,
): Promise<void> {
  try {
    const resolvedDirectory = await realpath(directory);
    if (visitedPaths.has(resolvedDirectory)) {
      return;
    }

    visitedPaths.add(resolvedDirectory);

    const entries = await readdir(resolvedDirectory, { withFileTypes: true });
    if (entries.some((entry) => entry.name === ".git" && (entry.isDirectory() || entry.isFile()))) {
      const directoryStats = await stat(resolvedDirectory);
      directories.push({
        name: path.basename(resolvedDirectory),
        directory: resolvedDirectory,
        lastModified: directoryStats.mtimeMs,
      });
      return;
    }

    if (remainingDepth === 0) {
      return;
    }

    await Promise.all(
      entries
        .filter((entry) => entry.isDirectory() && entry.name !== ".git")
        .map((entry) =>
          collectGitRepositories(
            path.join(resolvedDirectory, entry.name),
            remainingDepth - 1,
            directories,
            visitedPaths,
          ),
        ),
    );
  } catch {
    return;
  }
}
