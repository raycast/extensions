import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { basename } from "node:path";

/** A file and the space it takes on disk. */
export type LargeFile = { path: string; name: string; bytes: number };

/** The sizes Largest Files can list files from, smallest first. */
export const minimumSizes = [100_000_000, 1_000_000_000, 5_000_000_000] as const;

/**
 * The folder Largest Files searches: the one another command or a deeplink passed, used exactly as it
 * came apart from a leading `~` for the home folder, since a folder's name can hold backslashes or
 * spaces; else the preference's folder; else the home folder.
 */
export function searchedFolder(passed: string | undefined, preference: string | undefined, home: string): string {
  if (passed === "~") return home;
  if (passed?.startsWith("~/")) return home + passed.slice(1);
  if (passed?.startsWith("/")) return passed;
  return preference || home;
}

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
 * How many files are read at once. Node reads files on 4 threads, so more at once only waits in its
 * queue, and on 200,000 files a queue of every read took 5 times the memory and half again the time.
 */
const readsAtOnce = 16;

/**
 * The files among `paths`, largest first, counting the space each takes on disk as Sizewise does.
 * Paths that are gone or aren't files, such as app bundles Spotlight sizes as one item, are left out.
 * Every path is read, since only the disk says how much space a file takes, but `readsAtOnce` at a
 * time, and only files of at least `minimumBytes` are kept.
 */
export async function largeFiles(
  paths: string[],
  minimumBytes: number,
  statPath: (path: string) => Promise<Stat> = stat,
): Promise<LargeFile[]> {
  const files: LargeFile[] = [];
  let next = 0;
  async function read() {
    while (next < paths.length) {
      const path = paths[next++];
      try {
        const info = await statPath(path);
        const bytes = info.blocks * 512;
        if (info.isFile() && bytes >= minimumBytes) files.push({ path, name: basename(path), bytes });
      } catch {
        // Gone since Spotlight indexed it.
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(readsAtOnce, paths.length) }, read));
  return files.sort((a, b) => b.bytes - a.bytes || a.path.localeCompare(b.path)).slice(0, fileLimit);
}
