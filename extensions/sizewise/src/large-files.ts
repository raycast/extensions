import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { basename } from "node:path";

/** A file and the space it takes on disk. */
export type LargeFile = { path: string; name: string; bytes: number };

/** The sizes Largest Files can list files from, smallest first. */
export const minimumSizes = [100_000_000, 1_000_000_000, 5_000_000_000] as const;

/** At most this many files are listed, largest first. */
export const fileLimit = 200;

/**
 * Asks Spotlight for the files in `folder` at least `minimumBytes` large. Spotlight answers from
 * its index, so nothing is read from disk, and the query takes well under a second.
 */
export function spotlightFiles(folder: string, minimumBytes: number): Promise<string[]> {
  return new Promise((resolve, reject) => {
    execFile(
      "/usr/bin/mdfind",
      ["-0", "-onlyin", folder, `kMDItemFSSize >= ${minimumBytes}`],
      { maxBuffer: 64 * 1024 * 1024 },
      (error, stdout) => (error ? reject(error) : resolve(stdout.split("\0").filter((path) => path.length > 0))),
    );
  });
}

type Stat = { isFile(): boolean; blocks: number; size: number };

/**
 * The files among `paths`, largest first, counting the space each takes on disk as Sizewise does.
 * Paths that are gone or aren't files, such as app bundles Spotlight sizes as one item, are left out.
 */
export async function largeFiles(
  paths: string[],
  minimumBytes: number,
  statPath: (path: string) => Promise<Stat> = stat,
): Promise<LargeFile[]> {
  const files = await Promise.all(
    paths.map(async (path): Promise<LargeFile | undefined> => {
      try {
        const info = await statPath(path);
        if (!info.isFile()) return undefined;
        return { path, name: basename(path), bytes: info.blocks * 512 };
      } catch {
        return undefined;
      }
    }),
  );
  return files
    .filter((file): file is LargeFile => file !== undefined && file.bytes >= minimumBytes)
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, fileLimit);
}
