import { useCachedState } from "@raycast/utils";
import { useCallback, useEffect } from "react";
import { Repository, RepositoryCloningProcess } from "../types";
import { detectRepositoryLanguages } from "../utils/language-detector";
import { resolveTildePath } from "../utils/path-utils";
import { GitManager } from "../utils/git-manager";
import { basename } from "path";

/**
 * Hook for managing the list of repositories.
 * Repositories are sorted by last visit - most recent first.
 * Supports tilde (~) paths.
 */
export function useRepositoriesList() {
  // Cache the list of repositories between sessions
  const [repositories, setRepositories] = useCachedState<Repository[]>("managed-repositories-list", []);

  // Revalidate all repositories in the list: remove if not valid, update languageStats if missing
  useEffect(() => {
    const invalidRepositories = repositories.filter((repo) => {
      // Check if the directory exists and is a git repository
      try {
        GitManager.validateDirectory(repo.path);
        return false;
      } catch {
        return true;
      }
    });

    if (invalidRepositories.length === 0) return;

    setRepositories((current) => current.filter((r) => !invalidRepositories.includes(r)));
  }, []);

  /**
   * Adds a repository to the recent list.
   * Moves the repository to the top of the list (most recent position).
   * Resolves tilde (~) paths to absolute paths.
   */
  const addRepository = useCallback(
    async (path: string, cloning?: RepositoryCloningProcess) => {
      const resolvedPath = resolveTildePath(path).replace(/\/+$/, "");
      const stats = await detectRepositoryLanguages(resolvedPath);

      setRepositories((currentRepositories) => {
        if (currentRepositories.some((repo) => repo.path === resolvedPath)) return currentRepositories;

        const newRepo: Repository = {
          id: Buffer.from(resolvedPath).toString("base64"),
          name: basename(resolvedPath),
          path: resolvedPath,
          lastOpenedAt: Date.now(),
          languageStats: stats,
          cloning,
        };

        return [...currentRepositories, newRepo];
      });
    },
    [setRepositories],
  );

  const visitRepository = useCallback(
    async (repositoryPath: string) => {
      const index = repositories.findIndex((repo) => repo.path === repositoryPath);

      if (index === -1) {
        return addRepository(repositoryPath);
      }

      const stats = await detectRepositoryLanguages(repositoryPath);
      setRepositories((currentRepositories) =>
        currentRepositories.with(index, {
          ...currentRepositories[index],
          lastOpenedAt: Date.now(),
          languageStats: stats,
        }),
      );
    },
    [setRepositories],
  );

  /**
   * Removes a specific repository from the recent list.
   */
  const removeRepository = useCallback(
    (repositoryPath: string) => {
      setRepositories((currentRepositories) => currentRepositories.filter((repo) => repo.path !== repositoryPath));
    },
    [setRepositories],
  );

  /**
   * Updates the cloning state of a repository.
   */
  const updateCloningState = useCallback(
    async (repositoryPath: string, cloningProcess?: RepositoryCloningProcess) => {
      const stats = await detectRepositoryLanguages(repositoryPath);

      setRepositories((currentRepositories) =>
        currentRepositories.map((repo) => {
          if (repo.path !== repositoryPath) return repo;

          return {
            ...repo,
            languageStats: stats,
            cloning: cloningProcess,
          };
        }),
      );
    },
    [setRepositories],
  );

  return {
    repositories,
    addRepository,
    visitRepository,
    removeRepository,
    updateCloningState,
  };
}
