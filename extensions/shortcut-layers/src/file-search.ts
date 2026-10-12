import { execFile } from "child_process";
import { basename } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const DEFAULT_LIMIT = 40;

/** Parses newline-separated `mdfind` output into a deduped, capped list of paths. */
export function parseSearchOutput(stdout: string, limit = DEFAULT_LIMIT): string[] {
  const seen = new Set<string>();
  const results: string[] = [];
  for (const line of stdout.split("\n")) {
    const path = line.trim();
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
    const { stdout } = await execFileAsync("mdfind", ["-name", trimmed], { maxBuffer: 8 * 1024 * 1024 });
    return parseSearchOutput(stdout, limit);
  } catch {
    return [];
  }
}
