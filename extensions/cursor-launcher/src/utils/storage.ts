import { LocalStorage, getPreferenceValues } from "@raycast/api";
import type { RecentProject } from "./cursor";
import * as path from "path";
import * as fs from "fs";

const RECENT_PROJECTS_KEY = "recentProjects";
const PINNED_PROJECTS_KEY = "pinnedProjects";

const getMaxRecentProjects = (): number => {
  try {
    const prefs = getPreferenceValues<{ maxRecentProjects?: string }>();
    const max = prefs.maxRecentProjects
      ? parseInt(prefs.maxRecentProjects, 10)
      : 20;
    return isNaN(max) || max < 1 ? 20 : max;
  } catch {
    return 20;
  }
};

export const addRecentProject = async (projectPath: string): Promise<void> => {
  try {
    const projectName = path.basename(projectPath);
    const newProject: RecentProject = {
      path: projectPath,
      name: projectName,
      lastOpened: Date.now(),
    };

    const existing = await getRecentProjects();

    // Remove if already exists
    const filtered = existing.filter((p) => p.path !== projectPath);

    // Add to beginning
    const maxProjects = getMaxRecentProjects();
    const updated = [newProject, ...filtered].slice(0, maxProjects);

    await LocalStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to save recent project:", error);
  }
};

export const getRecentProjects = async (): Promise<RecentProject[]> => {
  try {
    const data = await LocalStorage.getItem(RECENT_PROJECTS_KEY);
    const projects: RecentProject[] = data ? JSON.parse(data as string) : [];

    // Filter out projects that no longer exist
    const validProjects = projects.filter((p) => {
      try {
        return fs.existsSync(p.path) && fs.statSync(p.path).isDirectory();
      } catch {
        return false;
      }
    });

    // Update storage if some projects were removed
    if (validProjects.length !== projects.length) {
      await LocalStorage.setItem(
        RECENT_PROJECTS_KEY,
        JSON.stringify(validProjects)
      );
    }

    // Get pinned projects and merge them at the top
    const pinnedPaths = await getPinnedProjects();
    const pinnedProjects: RecentProject[] = [];
    const unpinnedProjects: RecentProject[] = [];

    validProjects.forEach((project) => {
      if (pinnedPaths.includes(project.path)) {
        pinnedProjects.push(project);
      } else {
        unpinnedProjects.push(project);
      }
    });

    // Sort pinned projects by last opened (most recent first)
    pinnedProjects.sort((a, b) => b.lastOpened - a.lastOpened);

    // Return pinned first, then unpinned
    return [...pinnedProjects, ...unpinnedProjects];
  } catch (error) {
    console.error("Failed to load recent projects:", error);
    return [];
  }
};

export const removeRecentProject = async (
  projectPath: string
): Promise<void> => {
  try {
    const data = await LocalStorage.getItem(RECENT_PROJECTS_KEY);
    const projects: RecentProject[] = data ? JSON.parse(data as string) : [];
    const filtered = projects.filter((p) => p.path !== projectPath);
    await LocalStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to remove recent project:", error);
  }
};

export const clearRecentProjects = async (): Promise<void> => {
  try {
    await LocalStorage.removeItem(RECENT_PROJECTS_KEY);
  } catch (error) {
    console.error("Failed to clear recent projects:", error);
  }
};

export const getPinnedProjects = async (): Promise<string[]> => {
  try {
    const data = await LocalStorage.getItem(PINNED_PROJECTS_KEY);
    if (!data) {
      return [];
    }
    return JSON.parse(data as string);
  } catch (error) {
    console.error("Failed to load pinned projects:", error);
    return [];
  }
};

export const pinProject = async (projectPath: string): Promise<void> => {
  try {
    const pinned = await getPinnedProjects();
    if (!pinned.includes(projectPath)) {
      pinned.push(projectPath);
      await LocalStorage.setItem(PINNED_PROJECTS_KEY, JSON.stringify(pinned));
    }
  } catch (error) {
    console.error("Failed to pin project:", error);
  }
};

export const unpinProject = async (projectPath: string): Promise<void> => {
  try {
    const pinned = await getPinnedProjects();
    const filtered = pinned.filter((p) => p !== projectPath);
    await LocalStorage.setItem(PINNED_PROJECTS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to unpin project:", error);
  }
};

export const isPinned = async (projectPath: string): Promise<boolean> => {
  const pinned = await getPinnedProjects();
  return pinned.includes(projectPath);
};
