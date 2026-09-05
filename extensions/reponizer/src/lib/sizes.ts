import { run } from "./git";

/**
 * Disk usage per directory via `du -sk`, batched to avoid one process per repo.
 * Returns a map from absolute path to size in bytes. Unreadable paths are omitted.
 */
export async function directorySizes(paths: string[]): Promise<Map<string, number>> {
  const sizes = new Map<string, number>();
  const chunkSize = 50;
  for (let i = 0; i < paths.length; i += chunkSize) {
    const chunk = paths.slice(i, i + chunkSize);
    let stdout = "";
    try {
      stdout = (await run("/usr/bin/du", ["-sk", ...chunk], { timeoutMs: 120_000 })).stdout;
    } catch (error) {
      // du exits non-zero when single files are unreadable but still prints the rest
      stdout = (error as { stdout?: string }).stdout ?? "";
    }
    for (const line of stdout.split("\n")) {
      const match = /^(\d+)\t(.+)$/.exec(line);
      if (match) sizes.set(match[2], Number.parseInt(match[1], 10) * 1024);
    }
  }
  return sizes;
}
