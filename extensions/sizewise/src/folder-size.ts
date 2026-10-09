import { execFile } from "node:child_process";
import { formatBytes } from "./format";

/** How much space a folder takes up, and how many folders inside it couldn't be read. */
export type FolderSize = { bytes: number; unreadableFolderCount: number };

/** What `du` printed and whether it ran out of time. `du` exits with 1 after unreadable folders. */
export type DuOutput = { stdout: string; stderr: string; timedOut: boolean };

/**
 * The folders `du` skips, by name: other apps' data. Opening them makes macOS ask whether Raycast
 * may access data from other apps, and Sizewise doesn't open them either without Full Disk Access.
 */
const skippedNames = ["Containers", "Group Containers", "Daemon Containers"];

const timeout = 120_000;

/**
 * Runs the system's `du`, which counts allocated size as Sizewise does, without following
 * symbolic links (`-P`) or leaving the folder's disk (`-x`), as Sizewise's scanner doesn't either.
 */
export function runDu(path: string): Promise<DuOutput> {
  const args = ["-skxP", ...skippedNames.flatMap((name) => ["-I", name]), "--", path];
  return new Promise((resolve) => {
    execFile("/usr/bin/du", args, { timeout, maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) => {
      resolve({ stdout, stderr, timedOut: error?.killed === true });
    });
  });
}

/** Reads `du -sk`'s total and counts the folders it reported it couldn't read. */
export function parseDu(output: DuOutput): FolderSize | undefined {
  const total = /^(\d+)\t/m.exec(output.stdout);
  if (total === null) return undefined;
  const unreadableFolderCount = output.stderr
    .split("\n")
    .filter((line) => /: (Permission denied|Operation not permitted)$/.test(line)).length;
  return { bytes: Number(total[1]) * 1024, unreadableFolderCount };
}

export class MeasureError extends Error {}

export async function measureFolder(
  path: string,
  run: (path: string) => Promise<DuOutput> = runDu,
): Promise<FolderSize> {
  const output = await run(path);
  if (output.timedOut) {
    throw new MeasureError("Measuring took too long. Open the folder in Sizewise, which is faster.");
  }
  const size = parseDu(output);
  if (size === undefined)
    throw new MeasureError(
      output.stderr.trim() || "macOS didn't report a size for this folder. Open it in Sizewise instead.",
    );
  return size;
}

/** Says how much space a folder takes up, as the Get Folder Size Shortcuts action does. */
export function sizeSentence(name: string, size: FolderSize): string {
  const formatted = formatBytes(size.bytes);
  switch (size.unreadableFolderCount) {
    case 0:
      return `${name} takes up ${formatted}`;
    case 1:
      return `${name} takes up at least ${formatted} (1 folder couldn't be read)`;
    default:
      return `${name} takes up at least ${formatted} (${size.unreadableFolderCount} folders couldn't be read)`;
  }
}
