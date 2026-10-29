// Filesystem helpers with no @raycast/api import, so vitest can exercise them.
import { readdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";

const SKIPPED_DIRS = new Set(["node_modules"]);

type Visit = (dir: string, names: Set<string>) => "stop" | "descend";

/** Walk directories breadth-first to `depth`, skipping hidden and vendored ones. */
async function walk(root: string, depth: number, visit: Visit): Promise<void> {
  let level = [root];
  for (let current = 0; current <= depth && level.length > 0; current++) {
    const next: string[] = [];
    await Promise.all(
      level.map(async (dir) => {
        const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
        const names = new Set(entries.map((entry) => entry.name));
        if (visit(dir, names) === "stop") return;
        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith(".") && !SKIPPED_DIRS.has(entry.name)) {
            next.push(join(dir, entry.name));
          }
        }
      }),
    );
    level = next;
  }
}

/** Git repositories up to `depth` folders below `root`, sorted by path. */
export async function findRepos(root: string, depth: number): Promise<string[]> {
  const repos: string[] = [];
  await walk(root, depth, (dir, names) => {
    // `.git` is a folder in a clone and a file in a worktree or submodule.
    if (dir !== root && names.has(".git")) {
      repos.push(dir);
      return "stop";
    }
    return "descend";
  });
  return repos.sort();
}

/** Files ending in `extension` up to `depth` folders below `root`, sorted by path. */
export async function findFiles(root: string, extension: string, depth: number): Promise<string[]> {
  const files: string[] = [];
  await walk(root, depth, (dir, names) => {
    for (const name of names) {
      if (name.endsWith(extension)) files.push(join(dir, name));
    }
    return "descend";
  });
  return files.sort();
}

/** Split a selection into existing folders and files, deduped, in order. */
export async function classifyPaths(paths: string[]): Promise<{ directories: string[]; files: string[] }> {
  const unique = [...new Set(paths)];
  const kinds = await Promise.all(
    unique.map(async (path) => {
      const info = await stat(path).catch(() => undefined);
      return info?.isDirectory() ? "directory" : info ? "file" : undefined;
    }),
  );
  return {
    directories: unique.filter((_, index) => kinds[index] === "directory"),
    files: unique.filter((_, index) => kinds[index] === "file"),
  };
}

/** Where `path` sits below `root`: `/r/owner/repo` under `/r` is `owner`. */
export function relativeParent(path: string, root: string): string | undefined {
  const base = root.replace(/\/+$/, "");
  const parent = dirname(path.slice(base.length + 1));
  return parent === "." ? undefined : parent;
}
