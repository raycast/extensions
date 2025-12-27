import { useState, useEffect, useCallback } from "react";
import { showToast, Toast } from "@raycast/api";
import { Project } from "../types";
import {
  getProjects,
  deleteProject as removeProject,
  toggleFavorite as toggleFavoriteStorage,
  getGroups as getGroupsStorage,
} from "../lib/storage";

// ============================================
// Sorting Logic
// ============================================

export type SortOption = "smart" | "recent" | "alphabetical" | "created";

export const SORT_OPTIONS: { value: SortOption; title: string }[] = [
  { value: "smart", title: "Smart" },
  { value: "recent", title: "Recently Opened" },
  { value: "alphabetical", title: "A-Z" },
  { value: "created", title: "Recently Added" },
];

function sortProjects<T extends Project>(projects: T[], sortBy: SortOption = "smart"): T[] {
  return [...projects].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;

    switch (sortBy) {
      case "recent": {
        const aOpened = a.lastOpenedAt || 0;
        const bOpened = b.lastOpenedAt || 0;
        return bOpened - aOpened;
      }
      case "alphabetical":
        return a.alias.localeCompare(b.alias);
      case "created":
        return b.createdAt - a.createdAt;
      case "smart":
      default: {
        const now = Date.now();
        return calculateSmartScore(b, now) - calculateSmartScore(a, now);
      }
    }
  });
}

function calculateSmartScore(project: Project, now: number): number {
  let score = 0;
  if (project.lastOpenedAt) {
    const hoursAgo = (now - project.lastOpenedAt) / (1000 * 60 * 60);
    if (hoursAgo < 1) score += 100;
    else if (hoursAgo < 24) score += 80;
    else if (hoursAgo < 168) score += 50;
    else if (hoursAgo < 720) score += 20;
    else score += 5;
  }
  score += (project.createdAt / now) * 10;
  return score;
}

// ============================================
// useProjects Hook
// ============================================

interface UseProjectsReturn {
  projects: Project[];
  groups: string[];
  isLoading: boolean;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  refresh: () => Promise<void>;
  deleteProject: (project: Project) => Promise<boolean>;
  toggleFavorite: (project: Project) => Promise<void>;
}

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("smart");

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const [storedProjects, storedGroups] = await Promise.all([getProjects(), getGroupsStorage()]);
      setProjects(sortProjects(storedProjects, sortBy));
      setGroups(storedGroups);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load projects",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [sortBy]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Re-sort when sortBy changes
  useEffect(() => {
    if (projects.length > 0) {
      setProjects((prev) => sortProjects([...prev], sortBy));
    }
  }, [sortBy]);

  const refresh = useCallback(async () => {
    await loadProjects();
  }, [loadProjects]);

  const deleteProject = useCallback(
    async (project: Project): Promise<boolean> => {
      const success = await removeProject(project.id);
      if (success) {
        await loadProjects();
        await showToast({
          style: Toast.Style.Success,
          title: "Project deleted",
          message: project.alias,
        });
      }
      return success;
    },
    [loadProjects],
  );

  const toggleFavorite = useCallback(
    async (project: Project): Promise<void> => {
      const isFavorite = await toggleFavoriteStorage(project.id);
      await loadProjects();
      await showToast({
        style: Toast.Style.Success,
        title: isFavorite ? "Added to favorites" : "Removed from favorites",
        message: project.alias,
      });
    },
    [loadProjects],
  );

  return {
    projects,
    groups,
    isLoading,
    sortBy,
    setSortBy,
    refresh,
    deleteProject,
    toggleFavorite,
  };
}

// ============================================
// useProjectsSimple Hook (without git status)
// ============================================

interface UseProjectsSimpleReturn {
  projects: Project[];
  groups: string[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  deleteProject: (project: Project) => Promise<boolean>;
  toggleFavorite: (project: Project) => Promise<void>;
}

export function useProjectsSimple(): UseProjectsSimpleReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const [storedProjects, storedGroups] = await Promise.all([getProjects(), getGroupsStorage()]);
      setProjects(sortProjects(storedProjects));
      setGroups(storedGroups);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load projects",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const refresh = useCallback(async () => {
    await loadProjects();
  }, [loadProjects]);

  const deleteProject = useCallback(
    async (project: Project): Promise<boolean> => {
      const success = await removeProject(project.id);
      if (success) {
        await loadProjects();
        await showToast({
          style: Toast.Style.Success,
          title: "Project deleted",
          message: project.alias,
        });
      }
      return success;
    },
    [loadProjects],
  );

  const toggleFavorite = useCallback(
    async (project: Project): Promise<void> => {
      const isFavorite = await toggleFavoriteStorage(project.id);
      await loadProjects();
      await showToast({
        style: Toast.Style.Success,
        title: isFavorite ? "Added to favorites" : "Removed from favorites",
        message: project.alias,
      });
    },
    [loadProjects],
  );

  return {
    projects,
    groups,
    isLoading,
    refresh,
    deleteProject,
    toggleFavorite,
  };
}
