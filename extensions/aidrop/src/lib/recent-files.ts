import fs from "node:fs/promises";
import path from "node:path";

export interface FileItem {
  path: string;
  name: string;
  mtimeMs: number;
  size: number;
}

export const DEFAULT_RECENT_FILE_LIMIT = 10;

export async function loadRecentFiles(
  downloadsDir: string,
  limit = DEFAULT_RECENT_FILE_LIMIT,
): Promise<FileItem[]> {
  const entries = await fs.readdir(downloadsDir, { withFileTypes: true });

  const visibleFiles = entries.filter(
    (entry) => entry.isFile() && !entry.name.startsWith("."),
  );

  const detailed = await Promise.all(
    visibleFiles.map(async (entry) => {
      const fullPath = path.join(downloadsDir, entry.name);
      const stat = await fs.stat(fullPath);

      return {
        path: fullPath,
        name: entry.name,
        mtimeMs: stat.mtimeMs,
        size: stat.size,
      } satisfies FileItem;
    }),
  );

  return detailed
    .sort((left, right) => right.mtimeMs - left.mtimeMs)
    .slice(0, limit);
}
