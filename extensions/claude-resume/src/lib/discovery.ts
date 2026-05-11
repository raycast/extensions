import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { DiscoveredFile } from "./types";

/**
 * Expand common home-directory shortcuts in a path:
 *   `~`, `~/foo`, `$HOME`, `$HOME/foo`
 * Falls back to the input string if no pattern matches.
 */
export function expandPath(input: string): string {
  const home = os.homedir();
  if (input === "~") return home;
  if (input.startsWith("~/")) return path.join(home, input.slice(2));
  if (input === "$HOME") return home;
  if (input.startsWith("$HOME/")) return path.join(home, input.slice(6));
  return input;
}

/**
 * Recursively list all .jsonl files under rootPath.
 * Returns each file with its mtime (epoch ms) for cache-invalidation.
 *
 * Silently skips unreadable directories — partial results are better than no results.
 */
export async function listJsonlFiles(rootPath: string): Promise<DiscoveredFile[]> {
  const expanded = expandPath(rootPath);

  let rootStat;
  try {
    rootStat = await fs.stat(expanded);
  } catch {
    return [];
  }
  if (!rootStat.isDirectory()) {
    return [];
  }

  const results: DiscoveredFile[] = [];
  await walkDir(expanded, results);
  return results;
}

async function walkDir(dir: string, results: DiscoveredFile[]): Promise<void> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkDir(full, results);
    } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      try {
        const stat = await fs.stat(full);
        results.push({ path: full, mtime: stat.mtimeMs });
      } catch {
        // skip unreadable file
      }
    }
  }
}
