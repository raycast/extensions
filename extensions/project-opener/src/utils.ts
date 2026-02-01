import { readdirSync, statSync, existsSync } from "fs";
import { join, relative } from "path";
import { homedir } from "os";

export interface Project {
  name: string;
  path: string;
  relativePath: string;
}

export const PROJECT_MARKERS = [
  ".git",
  "package.json",
  "Cargo.toml",
  "go.mod",
  "pyproject.toml",
  "Makefile",
  "pom.xml",
  "build.gradle",
  "CMakeLists.txt",
];

export const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "vendor",
  "target",
  ".next",
  ".venv",
  "venv",
  "__pycache__",
  ".cache",
  "coverage",
  ".turbo",
  ".output",
]);

export function expandPath(path: string): string {
  if (path.startsWith("~")) {
    return join(homedir(), path.slice(1));
  }
  return path;
}

export function isProject(dirPath: string): boolean {
  return PROJECT_MARKERS.some((marker) => existsSync(join(dirPath, marker)));
}

export function findProjects(rootDir: string, maxDepth: number): Project[] {
  const projects: Project[] = [];
  const expandedRoot = expandPath(rootDir);

  function scan(dir: string, depth: number) {
    if (depth > maxDepth) return;

    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.startsWith(".") && entry !== ".git") continue;
      if (EXCLUDED_DIRS.has(entry)) continue;

      const fullPath = join(dir, entry);

      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (!stat.isDirectory()) continue;

      if (isProject(fullPath)) {
        const relativePath = relative(expandedRoot, fullPath);
        projects.push({
          name: entry,
          path: fullPath,
          relativePath: relativePath || entry,
        });
      } else if (depth < maxDepth) {
        scan(fullPath, depth + 1);
      }
    }
  }

  scan(expandedRoot, 0);
  return projects.sort((a, b) => a.name.localeCompare(b.name));
}
