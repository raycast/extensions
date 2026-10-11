import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { formatBytes } from "./format";

/**
 * How much space a folder takes up, how many folders inside it couldn't be read, and whether other
 * apps' data inside it was left out. Either one makes `bytes` a lower bound.
 */
export type FolderSize = { bytes: number; unreadableFolderCount: number; skipsOtherAppsData: boolean };

/** What `du` printed and whether it ran out of time. `du` exits with 1 after unreadable folders. */
export type DuOutput = { stdout: string; stderr: string; timedOut: boolean };

/**
 * The folders in a home's Library that hold other apps' data. Opening them makes macOS ask whether
 * Raycast may access data from other apps, and Sizewise doesn't open them either without Full Disk
 * Access, so `du` skips them.
 */
const otherAppsDataNames = ["Containers", "Group Containers", "Daemon Containers"];

/**
 * Which of those folders are inside `path`, by name. `du` can skip folders only by name, so it's told
 * to skip only the ones there. A folder elsewhere that shares a name is counted when none are inside,
 * and skipped with them when some are, which the size's "at least" covers.
 */
export function otherAppsDataInside(
  path: string,
  home: string = homedir(),
  exists: (path: string) => boolean = existsSync,
): string[] {
  // Finder gives folders with a trailing slash.
  const folder = path.replace(/\/+$/, "") || "/";
  return otherAppsDataNames.filter((name) => {
    const appsData = join(home, "Library", name);
    if (!exists(appsData)) return false;
    // The data volume reaches the home folder by a second path too.
    return [appsData, join("/System/Volumes/Data", appsData)].some(
      (inside) => folder === "/" || inside === folder || inside.startsWith(folder + "/"),
    );
  });
}

const timeout = 120_000;

/**
 * Runs the system's `du`, which counts allocated size as Sizewise does, without following
 * symbolic links (`-P`) or leaving the folder's disk (`-x`), as Sizewise's scanner doesn't either.
 */
export function runDu(path: string, skippedNames: string[] = otherAppsDataInside(path)): Promise<DuOutput> {
  const args = ["-skxP", ...skippedNames.flatMap((name) => ["-I", name]), "--", path];
  return new Promise((resolve) => {
    execFile("/usr/bin/du", args, { timeout, maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) => {
      resolve({ stdout, stderr, timedOut: error?.killed === true });
    });
  });
}

/** Reads `du -sk`'s total and counts the folders it reported it couldn't read. */
export function parseDu(output: DuOutput, skipsOtherAppsData = false): FolderSize | undefined {
  const total = /^(\d+)\t/m.exec(output.stdout);
  if (total === null) return undefined;
  const unreadableFolderCount = output.stderr
    .split("\n")
    .filter((line) => /: (Permission denied|Operation not permitted)$/.test(line)).length;
  return { bytes: Number(total[1]) * 1024, unreadableFolderCount, skipsOtherAppsData };
}

export class MeasureError extends Error {}

export async function measureFolder(
  path: string,
  run: (path: string, skippedNames: string[]) => Promise<DuOutput> = runDu,
  skippedNames: string[] = otherAppsDataInside(path),
): Promise<FolderSize> {
  const output = await run(path, skippedNames);
  if (output.timedOut) {
    throw new MeasureError("Measuring took too long. Open the folder in Sizewise, which is faster.");
  }
  const size = parseDu(output, skippedNames.length > 0);
  if (size === undefined)
    throw new MeasureError(
      output.stderr.trim() || "macOS didn't report a size for this folder. Open it in Sizewise instead.",
    );
  return size;
}

/** Says how much space a folder takes up, as the Get Folder Size Shortcuts action does. */
export function sizeSentence(name: string, size: FolderSize): string {
  const formatted = formatBytes(size.bytes);
  const left = [
    ...(size.unreadableFolderCount === 1 ? ["1 folder couldn't be read"] : []),
    ...(size.unreadableFolderCount > 1 ? [`${size.unreadableFolderCount} folders couldn't be read`] : []),
    ...(size.skipsOtherAppsData ? ["other apps' data isn't counted"] : []),
  ];
  if (left.length === 0) return `${name} takes up ${formatted}`;
  return `${name} takes up at least ${formatted} (${left.join(", and ")})`;
}
