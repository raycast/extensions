import { readdir, stat } from "fs/promises";
import { homedir } from "os";
import { basename, join } from "path";
import { isEbookFile } from "./ebooks";

export interface EbookFile {
  path: string;
  name: string;
  dir: string;
  size: number;
  modifiedAt: Date;
}

function resolveHome(p: string): string {
  return p.startsWith("~/") ? join(homedir(), p.slice(2)) : p;
}

async function scanDirectory(dirPath: string): Promise<EbookFile[]> {
  try {
    const names = await readdir(dirPath);
    const ebookFiles = await Promise.all(
      names.filter(isEbookFile).map(async (name) => {
        try {
          const full = join(dirPath, name);
          const stats = await stat(full);
          if (!stats.isFile()) return null;

          return {
            path: full,
            name,
            dir: basename(dirPath),
            size: stats.size,
            modifiedAt: stats.mtime,
          };
        } catch {
          return null;
        }
      }),
    );

    return ebookFiles.filter((file): file is EbookFile => file !== null);
  } catch {
    return [];
  }
}

export async function scanDirectories(
  paths: (string | undefined)[],
): Promise<EbookFile[]> {
  const seen = new Set<string>();
  const directories = paths.filter((p): p is string => Boolean(p));
  const files = await Promise.all(
    directories.map(resolveHome).map(scanDirectory),
  );

  return files
    .flat()
    .filter((file) =>
      seen.has(file.path) ? false : (seen.add(file.path), true),
    )
    .sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
}
