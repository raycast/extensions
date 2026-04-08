import fs from "fs";
import path from "path";
import os from "os";
import { LocalStorage } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import {
  listProjectDirs,
  resolveProjectPath,
  getMostRecentSession,
  listSessionFiles,
} from "./session-parser";
import { parseVSCodeWorkspaces } from "./vscode-storage";

const execPromise = promisify(exec);

export interface Project {
  path: string;
  name: string;
  isFavorite: boolean;
  lastAccessed?: Date;
  sessionCount?: number;
}

const FAVORITES_KEY = "claudecast-favorite-projects";
const RECENT_KEY = "claudecast-recent-projects";

/**
 * Get favorite projects from storage
 */
async function getFavorites(): Promise<string[]> {
  const stored = await LocalStorage.getItem<string>(FAVORITES_KEY);
  return stored ? JSON.parse(stored) : [];
}

/**
 * Save favorite projects to storage
 */
async function saveFavorites(favorites: string[]): Promise<void> {
  await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

/**
 * Add a project to favorites
 */
export async function addFavorite(projectPath: string): Promise<void> {
  const favorites = await getFavorites();
  if (!favorites.includes(projectPath)) {
    favorites.push(projectPath);
    await saveFavorites(favorites);
  }
}

/**
 * Remove a project from favorites
 */
export async function removeFavorite(projectPath: string): Promise<void> {
  const favorites = await getFavorites();
  const index = favorites.indexOf(projectPath);
  if (index >= 0) {
    favorites.splice(index, 1);
    await saveFavorites(favorites);
  }
}

/**
 * Check if a project is favorited
 */
export async function isFavorite(projectPath: string): Promise<boolean> {
  const favorites = await getFavorites();
  return favorites.includes(projectPath);
}

/**
 * Get recent projects from storage
 */
async function getRecentProjects(): Promise<
  { path: string; timestamp: number }[]
> {
  const stored = await LocalStorage.getItem<string>(RECENT_KEY);
  return stored ? JSON.parse(stored) : [];
}

/**
 * Add a project to recent list
 */
export async function addRecentProject(projectPath: string): Promise<void> {
  const recent = await getRecentProjects();
  const filtered = recent.filter((r) => r.path !== projectPath);
  filtered.unshift({ path: projectPath, timestamp: Date.now() });
  // Keep only last 20
  const trimmed = filtered.slice(0, 20);
  await LocalStorage.setItem(RECENT_KEY, JSON.stringify(trimmed));
}

/**
 * Discover projects from Claude Code's project directories
 * Optimized to avoid loading full session details - only counts files
 */
export async function discoverClaudeProjects(): Promise<Project[]> {
  const projectDirs = await listProjectDirs();
  const favorites = await getFavorites();
  const projects: Project[] = [];

  for (const encodedPath of projectDirs) {
    const projectPath = await resolveProjectPath(encodedPath);
    const projectName = path.basename(projectPath) || projectPath;

    // Get session count efficiently by just listing files (no parsing)
    const sessionFiles = await listSessionFiles(encodedPath);
    const sessionCount = sessionFiles.length;

    // Get last modified time from the most recent session file (by file stat, no parsing)
    let lastAccessed: Date | undefined;
    if (sessionCount > 0) {
      try {
        const claudeProjectsDir = path.join(
          os.homedir(),
          ".claude",
          "projects",
          encodedPath,
        );
        // Get stats for a few session files and find the most recent
        const stats = await Promise.all(
          sessionFiles.slice(0, 10).map(async (file) => {
            try {
              const stat = await fs.promises.stat(
                path.join(claudeProjectsDir, file),
              );
              return stat.mtime;
            } catch {
              return null;
            }
          }),
        );
        const validStats = stats.filter((s): s is Date => s !== null);
        if (validStats.length > 0) {
          lastAccessed = new Date(
            Math.max(...validStats.map((d) => d.getTime())),
          );
        }
      } catch {
        // Couldn't get file stats
      }
    }

    // Check if the directory actually exists on disk
    let exists = false;
    try {
      await fs.promises.access(projectPath);
      exists = true;
    } catch {
      exists = false;
    }

    if (exists || sessionCount > 0) {
      projects.push({
        path: projectPath,
        name: projectName,
        isFavorite: favorites.includes(projectPath),
        lastAccessed,
        sessionCount,
      });
    }
  }

  return projects;
}

/**
 * Discover VS Code recent workspaces
 * Uses shared utility to avoid code duplication
 */
export async function discoverVSCodeWorkspaces(): Promise<string[]> {
  return parseVSCodeWorkspaces();
}

/**
 * Get all projects (Claude + VS Code) sorted and categorized
 */
export async function getAllProjects(): Promise<{
  favorites: Project[];
  recent: Project[];
  all: Project[];
}> {
  const claudeProjects = await discoverClaudeProjects();
  const vscodeWorkspaces = await discoverVSCodeWorkspaces();
  const favorites = await getFavorites();
  const recentList = await getRecentProjects();

  // Combine projects
  const allProjectPaths = new Set(claudeProjects.map((p) => p.path));
  const projectsMap = new Map(claudeProjects.map((p) => [p.path, p]));

  // Add VS Code workspaces that aren't already in Claude projects
  for (const wsPath of vscodeWorkspaces) {
    if (!allProjectPaths.has(wsPath)) {
      allProjectPaths.add(wsPath);
      projectsMap.set(wsPath, {
        path: wsPath,
        name: path.basename(wsPath) || wsPath,
        isFavorite: favorites.includes(wsPath),
        sessionCount: 0,
      });
    }
  }

  const allProjects = Array.from(projectsMap.values());

  // Categorize
  const favoriteProjects = allProjects.filter((p) => p.isFavorite);

  const recentProjects = recentList
    .map((r) => projectsMap.get(r.path))
    .filter((p): p is Project => p !== undefined && !p.isFavorite)
    .slice(0, 10);

  const otherProjects = allProjects
    .filter((p) => !p.isFavorite && !recentList.some((r) => r.path === p.path))
    .sort((a, b) => {
      // Sort by last accessed, then by name
      if (a.lastAccessed && b.lastAccessed) {
        return b.lastAccessed.getTime() - a.lastAccessed.getTime();
      }
      if (a.lastAccessed) return -1;
      if (b.lastAccessed) return 1;
      return a.name.localeCompare(b.name);
    });

  return {
    favorites: favoriteProjects,
    recent: recentProjects,
    all: otherProjects,
  };
}

/**
 * Get the most recently accessed project
 */
export async function getMostRecentProject(): Promise<Project | null> {
  const recentSession = await getMostRecentSession();
  if (recentSession) {
    const favorites = await getFavorites();
    return {
      path: recentSession.projectPath,
      name: recentSession.projectName,
      isFavorite: favorites.includes(recentSession.projectPath),
      lastAccessed: recentSession.lastModified,
    };
  }
  return null;
}

/**
 * Get git info for a project
 */
export async function getGitInfo(
  projectPath: string,
): Promise<{ branch: string; hasChanges: boolean; remote?: string } | null> {
  try {
    const { stdout: branch } = await execPromise("git branch --show-current", {
      cwd: projectPath,
    });
    const { stdout: status } = await execPromise("git status --porcelain", {
      cwd: projectPath,
    });

    let remote: string | undefined;
    try {
      const { stdout: remoteUrl } = await execPromise(
        "git remote get-url origin",
        {
          cwd: projectPath,
        },
      );
      remote = remoteUrl.trim();
    } catch {
      // No remote
    }

    return {
      branch: branch.trim(),
      hasChanges: status.trim().length > 0,
      remote,
    };
  } catch {
    return null;
  }
}
