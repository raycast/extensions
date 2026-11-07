import { readdir, stat } from "fs/promises";
import { extname, join } from "path";

/**
 * Marks files this extension wrote, so they are never picked as the log to parse.
 */
export const PARSED_FILE_MARKER = "_parsed_";

export interface LogFile {
  path: string;
  name: string;
  modified: Date;
  size: number;
}

/**
 * Turns the "File Extensions" preference (".log, txt , .OUT") into [".log", ".txt", ".out"].
 */
export function parseExtensions(value: string): string[] {
  return value
    .split(",")
    .map((ext) => ext.trim().toLowerCase())
    .filter((ext) => ext.length > 0)
    .map((ext) => (ext.startsWith(".") ? ext : `.${ext}`));
}

/**
 * Log files in `folderPath` with one of the allowed extensions, most recently
 * modified first. Follows symlinks (e.g. `latest.log`) and skips folders and
 * files this extension produced.
 */
export async function listLogFiles(folderPath: string, fileExtensions: string): Promise<LogFile[]> {
  const allowedExtensions = parseExtensions(fileExtensions);
  if (allowedExtensions.length === 0) {
    throw new Error("No file extensions specified in preferences");
  }

  let names: string[];
  try {
    names = await readdir(folderPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Folder does not exist: ${folderPath}`);
    }
    throw error;
  }

  const candidates = names.filter(
    (name) => allowedExtensions.includes(extname(name).toLowerCase()) && !name.includes(PARSED_FILE_MARKER),
  );

  const files = await Promise.all(
    candidates.map(async (name): Promise<LogFile | null> => {
      const path = join(folderPath, name);
      try {
        const stats = await stat(path);
        return stats.isFile() ? { path, name, modified: stats.mtime, size: stats.size } : null;
      } catch {
        // Broken symlink or a file removed while listing.
        return null;
      }
    }),
  );

  return files
    .filter((file): file is LogFile => file !== null)
    .sort((a, b) => b.modified.getTime() - a.modified.getTime());
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let size = bytes / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size.toFixed(size < 10 ? 1 : 0)} ${units[unit]}`;
}
