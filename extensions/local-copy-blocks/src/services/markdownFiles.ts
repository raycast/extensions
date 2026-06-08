import fs from "fs/promises";
import path from "path";
import type { ConfiguredBlockSet, BlockFile, BlockFileLoadResult, BlockSetLoadFailure } from "../types";

const EXCLUDED_DIRECTORY_NAMES = new Set([".git", "node_modules"]);

export async function listBlockFiles(blockSet: ConfiguredBlockSet): Promise<BlockFile[]> {
  const rootPath = path.resolve(blockSet.directory);
  const rootStat = await fs.stat(rootPath);

  if (!rootStat.isDirectory()) {
    throw new Error(`${blockSet.displayName} is not a directory: ${rootPath}`);
  }

  const files = await walkDirectory(rootPath, rootPath, blockSet);
  return files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

export async function listBlockFilesFromBlockSets(blockSets: ConfiguredBlockSet[]): Promise<BlockFileLoadResult> {
  const results = await Promise.allSettled(blockSets.map((blockSet) => listBlockFiles(blockSet)));
  const files: BlockFile[] = [];
  const failures: BlockSetLoadFailure[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      files.push(...result.value);
      return;
    }

    failures.push({
      blockSet: blockSets[index],
      message: getErrorMessage(result.reason),
    });
  });

  return { files, failures };
}

async function walkDirectory(
  rootPath: string,
  currentPath: string,
  blockSet: ConfiguredBlockSet,
): Promise<BlockFile[]> {
  const entries = await fs.readdir(currentPath, { withFileTypes: true });
  const files: BlockFile[] = [];

  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      continue;
    }

    const entryPath = path.join(currentPath, entry.name);

    if (entry.isDirectory()) {
      if (shouldSkipDirectory(entry.name)) {
        continue;
      }

      files.push(...(await walkDirectory(rootPath, entryPath, blockSet)));
      continue;
    }

    if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".md") {
      continue;
    }

    const stat = await fs.stat(entryPath);

    files.push({
      path: entryPath,
      name: entry.name,
      relativePath: path.relative(rootPath, entryPath),
      blockSet,
      updatedAt: stat.mtime,
      size: stat.size,
    });
  }

  return files;
}

function shouldSkipDirectory(directoryName: string): boolean {
  return directoryName.startsWith(".") || EXCLUDED_DIRECTORY_NAMES.has(directoryName);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
