import { execFile } from "child_process";
import { basename } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const DEFAULT_LIMIT = 40;
const MAX_BUFFER = 32 * 1024 * 1024;

/**
 * Parses `mdfind -0` output. Paths are NUL-separated and kept verbatim, since a
 * filename may contain spaces or newlines.
 */
export function parseSearchOutput(stdout: string, limit = DEFAULT_LIMIT): string[] {
  const seen = new Set<string>();
  const results: string[] = [];
  for (const path of stdout.split("\0")) {
    if (!path || seen.has(path)) continue;
    seen.add(path);
    results.push(path);
    if (results.length >= limit) break;
  }
  return results;
}

export function fileTitle(path: string): string {
  return basename(path) || path;
}

/**
 * Searches the filesystem by name via Spotlight. Returns an empty list when the
 * query is too short or Spotlight has no matches (or is unavailable).
 */
export async function searchFiles(query: string, limit = DEFAULT_LIMIT): Promise<string[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  try {
    const { stdout } = await execFileAsync("mdfind", ["-0", "-name", trimmed], { maxBuffer: MAX_BUFFER });
    return parseSearchOutput(stdout, limit);
  } catch {
    return [];
  }
}
