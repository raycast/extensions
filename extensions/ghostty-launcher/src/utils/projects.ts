import fs from "fs";
import path from "path";
import { homedir } from "os";
import { getRecentDirectoriesFromHistory } from "./shell-history";

export interface Project {
  name: string;
  path: string;
  relativePath: string;
  lastModified: Date;
  projectType: "git" | "node" | "rust" | "python" | "go" | "directory";
  source: "scan" | "history";
}

const PROJECT_MARKERS = [
  { file: ".git", type: "git" as const },
  { file: "package.json", type: "node" as const },
  { file: "Cargo.toml", type: "rust" as const },
  { file: "pyproject.toml", type: "python" as const },
  { file: "requirements.txt", type: "python" as const },
  { file: "go.mod", type: "go" as const },
  { file: "Makefile", type: "directory" as const },
];

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".cache",
  "target",
  "vendor",
  "__pycache__",
  ".venv",
  "venv",
  ".idea",
  ".vscode",
]);

export async function getRecentProjects(
  projectPaths: string[],
  maxDepth: number,
  useShellHistory: boolean,
): Promise<Project[]> {
  const projectMap = new Map<string, Project>();

  // Scan configured directories
  for (const basePath of projectPaths) {
    if (!fs.existsSync(basePath)) continue;

    const projects = await scanDirectory(basePath, maxDepth, 0);
    for (const project of projects) {
      if (!projectMap.has(project.path)) {
        projectMap.set(project.path, project);
      }
    }
  }

  // Get projects from shell history
  if (useShellHistory) {
    const historyDirs = await getRecentDirectoriesFromHistory();
    for (const dir of historyDirs) {
      if (projectMap.has(dir)) {
        // Update source if already found
        const existing = projectMap.get(dir)!;
        existing.source = "history";
      } else {
        // Check if it's a valid project
        const projectType = detectProjectType(dir);
        if (projectType && fs.existsSync(dir)) {
          try {
            const stats = fs.statSync(dir);
            projectMap.set(dir, {
              name: path.basename(dir),
              path: dir,
              relativePath: dir.replace(homedir(), "~"),
              lastModified: stats.mtime,
              projectType,
              source: "history",
            });
          } catch {
            // Skip inaccessible directories
          }
        }
      }
    }
  }

  // Sort by last modified date (most recent first)
  const projects = Array.from(projectMap.values());
  projects.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

  return projects;
}

async function scanDirectory(
  dirPath: string,
  maxDepth: number,
  currentDepth: number,
): Promise<Project[]> {
  const projects: Project[] = [];

  if (currentDepth > maxDepth) return projects;

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    // Check if this directory is a project
    const projectType = detectProjectType(dirPath);
    if (projectType) {
      const stats = fs.statSync(dirPath);
      projects.push({
        name: path.basename(dirPath),
        path: dirPath,
        relativePath: dirPath.replace(homedir(), "~"),
        lastModified: stats.mtime,
        projectType,
        source: "scan",
      });
      // Don't scan subdirectories of a project
      return projects;
    }

    // Recursively scan subdirectories
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (IGNORED_DIRS.has(entry.name)) continue;
      if (entry.name.startsWith(".")) continue;

      const subPath = path.join(dirPath, entry.name);
      const subProjects = await scanDirectory(
        subPath,
        maxDepth,
        currentDepth + 1,
      );
      projects.push(...subProjects);
    }
  } catch {
    // Skip directories we can't read
  }

  return projects;
}

function detectProjectType(dirPath: string): Project["projectType"] | null {
  for (const marker of PROJECT_MARKERS) {
    const markerPath = path.join(dirPath, marker.file);
    if (fs.existsSync(markerPath)) {
      return marker.type;
    }
  }
  return null;
}
