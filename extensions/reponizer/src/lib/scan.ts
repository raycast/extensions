import fs from "node:fs/promises";
import path from "node:path";

export const OFFLOAD_FILE = "reponizer-offloaded.json";

export interface ScanResult {
  /** Absolute paths of directories containing a .git entry. */
  repos: string[];
  /** Absolute paths of directories containing an offload placeholder file. */
  offloaded: string[];
}

/**
 * Walk the root looking for git repositories and offload placeholders.
 * Recursion stops at repos (no nested-repo scanning) and at hidden directories.
 */
export async function findRepoDirs(root: string, maxDepth: number): Promise<ScanResult> {
  const result: ScanResult = { repos: [], offloaded: [] };
  await walk(root, 0);
  result.repos.sort();
  result.offloaded.sort();
  return result;

  async function walk(dir: string, depth: number): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return; // unreadable directory (permissions) — skip rather than abort the scan
    }
    const names = new Set(entries.map((e) => e.name));
    if (names.has(".git")) {
      result.repos.push(dir);
      return;
    }
    if (names.has(OFFLOAD_FILE)) {
      result.offloaded.push(dir);
      return;
    }
    if (depth >= maxDepth) return;
    const subdirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules");
    await Promise.all(subdirs.map((e) => walk(path.join(dir, e.name), depth + 1)));
  }
}
