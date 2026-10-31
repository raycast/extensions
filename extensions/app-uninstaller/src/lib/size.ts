import { execCapture } from "./exec";

/**
 * Disk usage for many paths, in bytes, keyed by path.
 *
 * One `du` call covers the whole list — measuring every installed application
 * takes seconds, so callers should treat this as background work rather than
 * something to block a list on. Unreadable paths report 0 rather than failing
 * the batch. The result is a plain object so it can be cached as JSON.
 */
export async function measurePaths(paths: string[]): Promise<Record<string, number>> {
  const sizes: Record<string, number> = Object.fromEntries(paths.map((path) => [path, 0]));
  if (paths.length === 0) return sizes;

  // du exits non-zero when any single path is unreadable, but still prints the
  // sizes it did manage to measure.
  const stdout = await execCapture("/usr/bin/du", ["-sk", "--", ...paths], 120_000);
  for (const line of stdout.split("\n")) {
    const separator = line.indexOf("\t");
    if (separator === -1) continue;
    const kilobytes = Number.parseInt(line.slice(0, separator), 10);
    const path = line.slice(separator + 1);
    if (Number.isFinite(kilobytes) && path in sizes) {
      sizes[path] = kilobytes * 1024;
    }
  }
  return sizes;
}
