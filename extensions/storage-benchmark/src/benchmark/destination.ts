import { lstat, mkdir, readdir, unlink } from "node:fs/promises";
import path from "node:path";

// Keep the original private namespace so existing test directories and stale files remain discoverable after rebranding.
export const BENCHMARK_DIRECTORY_NAME = ".raycast-disk-speed-test";
const STALE_FILE_AGE_MILLISECONDS = 60 * 60 * 1_000;
const BENCHMARK_FILE_PATTERN =
  /^\.raycast-disk-speed-v1-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.tmp$/i;

export async function ensureBenchmarkDirectory(selectedRoot: string): Promise<string> {
  const directory =
    path.basename(selectedRoot) === BENCHMARK_DIRECTORY_NAME
      ? selectedRoot
      : path.join(selectedRoot, BENCHMARK_DIRECTORY_NAME);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  return directory;
}

export async function cleanupStaleBenchmarkFiles(directory: string, now = new Date()): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return [];
    throw error;
  }

  const removed: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !BENCHMARK_FILE_PATTERN.test(entry.name)) continue;
    const filePath = path.join(directory, entry.name);
    const metadata = await lstat(filePath);
    if (!metadata.isFile() || now.getTime() - metadata.mtimeMs < STALE_FILE_AGE_MILLISECONDS) continue;
    await unlink(filePath);
    removed.push(entry.name);
  }
  return removed.sort();
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
