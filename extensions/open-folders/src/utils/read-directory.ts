import { readdirSync, statSync, type Dirent } from "fs";
import { join } from "path";

export type FileEntry = {
  name: string;
  fullPath: string;
  isDirectory: boolean;
  isFile: boolean;
  birthtime: Date;
  size: number;
};

function toEntry(item: Dirent): FileEntry {
  const fullPath = join(item.path, item.name);
  let birthtime = new Date(0);
  let size = 0;
  try {
    const stats = statSync(fullPath);
    birthtime = stats.birthtime;
    size = stats.size;
  } catch {
    // ignore stat errors
  }
  return {
    name: item.name,
    fullPath,
    isDirectory: item.isDirectory(),
    isFile: item.isFile(),
    birthtime,
    size,
  };
}

export type ReadResult = {
  entries: FileEntry[];
  error?: string;
};

export function readDirectorySafe(dir: string): ReadResult {
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
      .filter((item) => !item.name.startsWith("."))
      .map(toEntry);
    return { entries };
  } catch (error) {
    return {
      entries: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function readFiles(dir: string): ReadResult {
  const result = readDirectorySafe(dir);
  return {
    ...result,
    entries: result.entries.filter((e) => e.isFile).sort((a, b) => b.birthtime.getTime() - a.birthtime.getTime()),
  };
}

export function readFolders(dir: string): ReadResult {
  const result = readDirectorySafe(dir);
  return {
    ...result,
    entries: result.entries.filter((e) => e.isDirectory).sort((a, b) => a.name.localeCompare(b.name)),
  };
}
