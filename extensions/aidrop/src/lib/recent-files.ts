import fs from "node:fs/promises";
import path from "node:path";

export interface FileItem {
  path: string;
  name: string;
  mtimeMs: number;
  size: number;
  sourceFolder: string;
}

export const DEFAULT_RECENT_FILE_LIMIT = 10;

export async function loadRecentFiles(
  downloadsDir: string,
  limit = DEFAULT_RECENT_FILE_LIMIT,
): Promise<FileItem[]> {
  return loadRecentFilesFromFolders([downloadsDir], limit);
}

export async function loadRecentFilesFromFolders(
  folderPaths: string[],
  limit = DEFAULT_RECENT_FILE_LIMIT,
): Promise<FileItem[]> {
  const results = await Promise.allSettled(
    folderPaths.map((folderPath) => loadFilesFromFolder(folderPath)),
  );

  const allFiles: FileItem[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      allFiles.push(...result.value);
    }
  }

  return allFiles
    .sort((left, right) => right.mtimeMs - left.mtimeMs)
    .slice(0, limit);
}

async function loadFilesFromFolder(folderPath: string): Promise<FileItem[]> {
  const entries = await fs.readdir(folderPath, { withFileTypes: true });

  const visibleFiles = entries.filter(
    (entry) => entry.isFile() && !entry.name.startsWith("."),
  );

  return Promise.all(
    visibleFiles.map(async (entry) => {
      const fullPath = path.join(folderPath, entry.name);
      const stat = await fs.stat(fullPath);

      return {
        path: fullPath,
        name: entry.name,
        mtimeMs: stat.mtimeMs,
        size: stat.size,
        sourceFolder: folderPath,
      } satisfies FileItem;
    }),
  );
}
