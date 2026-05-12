import fs from "fs/promises";
import path from "path";
import type { ConfiguredPromptSet, PromptFile } from "../types";

const EXCLUDED_DIRECTORY_NAMES = new Set([".git", "node_modules"]);

export async function listPromptFiles(promptSet: ConfiguredPromptSet): Promise<PromptFile[]> {
  const rootPath = path.resolve(promptSet.directory);
  const rootStat = await fs.stat(rootPath);

  if (!rootStat.isDirectory()) {
    throw new Error(`${promptSet.displayName} is not a directory: ${rootPath}`);
  }

  const files = await walkDirectory(rootPath, rootPath, promptSet);
  return files.sort((left, right) => left.relativePath.localeCompare(right.relativePath, "ja"));
}

export async function listPromptFilesFromPromptSets(promptSets: ConfiguredPromptSet[]): Promise<PromptFile[]> {
  const fileGroups = await Promise.all(promptSets.map((promptSet) => listPromptFiles(promptSet)));
  return fileGroups.flat();
}

async function walkDirectory(
  rootPath: string,
  currentPath: string,
  promptSet: ConfiguredPromptSet,
): Promise<PromptFile[]> {
  const entries = await fs.readdir(currentPath, { withFileTypes: true });
  const files: PromptFile[] = [];

  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      continue;
    }

    const entryPath = path.join(currentPath, entry.name);

    if (entry.isDirectory()) {
      if (shouldSkipDirectory(entry.name)) {
        continue;
      }

      files.push(...(await walkDirectory(rootPath, entryPath, promptSet)));
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
      promptSet,
      updatedAt: stat.mtime,
      size: stat.size,
    });
  }

  return files;
}

function shouldSkipDirectory(directoryName: string): boolean {
  return directoryName.startsWith(".") || EXCLUDED_DIRECTORY_NAMES.has(directoryName);
}
