import { useCallback } from "react";
import { showToast, Toast } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { Project } from "../types";
import {
  getProjects,
  deleteProject as removeProject,
  toggleFavorite as toggleFavoriteStorage,
  getGroups as getGroupsStorage,
} from "../lib/storage";

// ============================================
// Sorting Constants
// ============================================

export type SortOption = "smart" | "recent" | "alphabetical" | "created";

export const SORT_OPTIONS: { value: SortOption; title: string }[] = [
  { value: "smart", title: "Smart" },
  { value: "recent", title: "Recently Opened" },
  { value: "alphabetical", title: "A-Z" },
  { value: "created", title: "Recently Added" },
];

// Smart score weights based on recency
const SMART_SCORE = {
  WITHIN_HOUR: 100,
  WITHIN_DAY: 80,
  WITHIN_WEEK: 50,
  WITHIN_MONTH: 20,
  OLDER: 5,
  RECENCY_WEIGHT: 10,
} as const;

// Time thresholds in hours
const TIME_THRESHOLDS = {
  HOUR: 1,
  DAY: 24,
  WEEK: 168,
  MONTH: 720,
} as const;

// ============================================
// Sorting Logic
// ============================================

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
    if (hoursAgo < TIME_THRESHOLDS.HOUR) score += SMART_SCORE.WITHIN_HOUR;
    else if (hoursAgo < TIME_THRESHOLDS.DAY) score += SMART_SCORE.WITHIN_DAY;
    else if (hoursAgo < TIME_THRESHOLDS.WEEK) score += SMART_SCORE.WITHIN_WEEK;
    else if (hoursAgo < TIME_THRESHOLDS.MONTH) score += SMART_SCORE.WITHIN_MONTH;
    else score += SMART_SCORE.OLDER;
  }
  // Bonus for recently created projects (within a week)
  const createdHoursAgo = (now - project.createdAt) / (1000 * 60 * 60);
  if (createdHoursAgo < TIME_THRESHOLDS.WEEK) {
    score += SMART_SCORE.RECENCY_WEIGHT;
  }
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
  // Persist sort option across sessions
  const [sortBy, setSortBy] = useCachedState<SortOption>("projects-sort-option", "smart");

  // Fetch projects with caching
  const {
    data: projectsData,
    isLoading: projectsLoading,
    revalidate: revalidateProjects,
  } = useCachedPromise(getProjects, [], { keepPreviousData: true });

  // Fetch groups with caching
  const {
    data: groupsData,
    isLoading: groupsLoading,
    revalidate: revalidateGroups,
  } = useCachedPromise(getGroupsStorage, [], { keepPreviousData: true });

  const projects = sortProjects(projectsData ?? [], sortBy);
  const groups = groupsData ?? [];
  const isLoading = projectsLoading || groupsLoading;

  const refresh = useCallback(async () => {
    await Promise.all([revalidateProjects(), revalidateGroups()]);
  }, [revalidateProjects, revalidateGroups]);

  const deleteProject = useCallback(
    async (project: Project): Promise<boolean> => {
      const success = await removeProject(project.id);
      if (success) {
        await refresh();
        await showToast({
          style: Toast.Style.Success,
          title: "Project deleted",
          message: project.alias,
        });
      }
      return success;
    },
    [refresh],
  );

  const toggleFavorite = useCallback(
    async (project: Project): Promise<void> => {
      const isFavorite = await toggleFavoriteStorage(project.id);
      await refresh();
      await showToast({
        style: Toast.Style.Success,
        title: isFavorite ? "Added to favorites" : "Removed from favorites",
        message: project.alias,
      });
    },
    [refresh],
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
