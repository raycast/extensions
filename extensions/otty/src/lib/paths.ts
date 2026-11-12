import { readdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";

const SKIPPED_DIRS = new Set(["node_modules"]);

type Visit = (dir: string, names: Set<string>) => "stop" | "descend";

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

export function relativeParent(path: string, root: string): string | undefined {
  const base = root.replace(/\/+$/, "");
  const parent = dirname(path.slice(base.length + 1));
  return parent === "." ? undefined : parent;
}

export function expandHome(path: string | undefined, home: string): string | undefined {
  const trimmed = path?.trim();
  return trimmed ? trimmed.replace(/^~(?=$|\/)/, home) : undefined;
}

export function abbreviateHome(path: string, home: string): string {
  if (path === home) return "~";
  if (path.startsWith(`${home}/`)) return `~${path.slice(home.length)}`;
  return path;
}

export function basename(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? path;
}
