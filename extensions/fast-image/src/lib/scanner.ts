import { readdir, stat } from "fs/promises";
import { extname, join } from "path";
import { ImageFile } from "../types";

// Formats Chromium can render directly as <img>, plus PDF (rendered separately as a thumbnail).
const SUPPORTED_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
  ".ico",
  ".avif",
  ".pdf",
]);

export async function scanImagesFolder(rootFolder: string): Promise<ImageFile[]> {
  const results: ImageFile[] = [];

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (!entry.isFile()) continue;

      const extension = extname(entry.name).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.has(extension)) continue;

      try {
        const stats = await stat(fullPath);
        results.push({
          path: fullPath,
          name: entry.name,
          extension: extension.slice(1),
          size: stats.size,
          mtimeMs: stats.mtimeMs,
          createdAtMs: stats.birthtimeMs,
        });
      } catch {
        // File may have been removed/locked between readdir and stat; skip it.
      }
    }
  }

  await walk(rootFolder);
  return results;
}
