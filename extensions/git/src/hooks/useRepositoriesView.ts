import { useCachedState } from "@raycast/utils";
import { Repository } from "../types";
import { useMemo, useState } from "react";

export type RepositoriesOrder = "visit-date" | "alphabetical";
export type RepositoriesGroup = "none" | "language" | "parent";
export type RepositoriesView = { order: RepositoriesOrder; group: RepositoriesGroup };
export type RepositoriesViewOptions = {
  groupBy: RepositoriesGroup;
  orderBy: RepositoriesOrder;
};

export type StructuredRepositories = { groupTitle: string; repositories: Repository[] };

/**
 * Places worktrees right after the repository they belong to, keeping the given order otherwise.
 * Worktrees whose repository is not in the list keep their own position.
 */
function keepWorktreesNextToRepository(repositories: Repository[]): Repository[] {
  const worktreesByRepositoryPath = new Map<string, Repository[]>();
  const rest: Repository[] = [];

  for (const repository of repositories) {
    const originPath = repository.worktree?.repositoryRootPath;

    if (originPath && repositories.some((candidate) => candidate.path === originPath)) {
      worktreesByRepositoryPath.set(originPath, [...(worktreesByRepositoryPath.get(originPath) ?? []), repository]);
    } else {
      rest.push(repository);
    }
  }

  if (worktreesByRepositoryPath.size === 0) return repositories;

  return rest.flatMap((repository) => [repository, ...(worktreesByRepositoryPath.get(repository.path) ?? [])]);
}

export function useRepositoriesView(repositories: Repository[], options?: RepositoriesViewOptions) {
  const [currentView, setCurrentView] = options
    ? useState<RepositoriesView>({
        order: options.orderBy,
        group: options.groupBy,
      })
    : useCachedState<RepositoriesView>("repositories-list-view", {
        order: "visit-date",
        group: "parent",
      });

  const displayedRepositories = useMemo<StructuredRepositories[]>(() => {
    const sorted = keepWorktreesNextToRepository(
      [...repositories].sort((a: Repository, b: Repository) => {
        switch (currentView.order) {
          case "visit-date":
            return b.lastOpenedAt - a.lastOpenedAt;
          case "alphabetical":
            return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        }
      }),
    );

    if (currentView.group === "none") {
      switch (currentView.order) {
        case "visit-date":
          return [{ groupTitle: "Recently Visited Repositories", repositories: sorted }];
        case "alphabetical":
          return [{ groupTitle: "Alphabetically Sorted", repositories: sorted }];
      }
    }

    const groups = new Map<string, Repository[]>();

    const getParentDirectoryName = (fullPath: string): string => {
      const trimmed = fullPath.replace(/\/+$/, "");
      const lastSlashIdx = trimmed.lastIndexOf("/");
      if (lastSlashIdx <= 0) return "/";
      const parent = trimmed.slice(0, lastSlashIdx);
      const parentLastSlashIdx = parent.lastIndexOf("/");
      if (parentLastSlashIdx < 0) return parent;
      const name = parent.slice(parentLastSlashIdx + 1) || parent;
      return name;
    };

    for (const repo of sorted) {
      switch (currentView.group) {
        case "language":
          if (repo.languageStats && repo.languageStats.length > 0) {
            const primaryLanguage = repo.languageStats[0];
            const groupTitle = primaryLanguage.name;
            const existingGroup = groups.get(groupTitle) || [];
            groups.set(groupTitle, [...existingGroup, repo]);
            break;
          } else {
            const groupTitle = "Unknown";
            const existingGroup = groups.get(groupTitle) || [];
            groups.set(groupTitle, [...existingGroup, repo]);
          }
          break;
        case "parent": {
          const groupTitle = getParentDirectoryName(repo.path);
          const existingGroup = groups.get(groupTitle) || [];
          groups.set(groupTitle, [...existingGroup, repo]);
          break;
        }
      }
    }

    return Array.from(groups.entries())
      .sort(([a, aRepos], [b, bRepos]) => {
        switch (currentView.order) {
          case "visit-date": {
            const aLatestVisit = Math.max(...aRepos.map((repo) => repo.lastOpenedAt || 0));
            const bLatestVisit = Math.max(...bRepos.map((repo) => repo.lastOpenedAt || 0));
            return bLatestVisit - aLatestVisit;
          }
          case "alphabetical":
            return a.localeCompare(b, undefined, { sensitivity: "base" });
        }
      })
      .map(([groupTitle, repos]) => ({ groupTitle, repositories: repos }));
  }, [repositories, currentView]);

  return {
    currentView,
    setCurrentView,
    displayedRepositories,
  };
}
