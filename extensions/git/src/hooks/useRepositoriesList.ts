import { useCallback, useEffect, useMemo, useRef } from "react";
import { useCachedPromise } from "@raycast/utils";
import { useStorage } from "./useStorage";
import { Repository, RepositoryCloningProcess, WorktreeOrigin } from "../types";
import { detectRepositoryLanguages } from "../utils/language-detector";
import { realPath, resolveTildePath } from "../utils/path-utils";
import { GitManager } from "../utils/git-manager";
import { basename } from "path";

/**
 * Linked worktree discovered in one of the stored repositories.
 */
type DiscoveredWorktree = {
  /** Absolute path of the repository the worktree belongs to. */
  repositoryRootPath: string;
  /** Absolute path of the worktree directory. */
  path: string;
  /** Folder name of the worktree directory. */
  name: string;
};

/**
 * Hook for managing the list of repositories.
 * Repositories are sorted by last visit - most recent first.
 * Linked worktrees of the stored repositories are discovered automatically and listed alongside them.
 * Supports tilde (~) paths.
 */
export function useRepositoriesList() {
  const [storedRepositories, setRepositories] = useStorage<Repository[]>("managed-repositories-list", []);

  // Keeps callbacks stable while still reading the latest stored list
  const storedRepositoriesRef = useRef(storedRepositories);
  storedRepositoriesRef.current = storedRepositories;

  const repositoryPaths = useMemo(
    () => storedRepositories.filter((repo) => !repo.cloning).map((repo) => repo.path),
    [storedRepositories],
  );

  // Worktrees are derived from the stored repositories instead of being persisted on their own
  const { data: discoveredWorktrees } = useCachedPromise(discoverWorktrees, [repositoryPaths], {
    initialData: [] as DiscoveredWorktree[],
  });

  const repositories = useMemo<Repository[]>(() => {
    const storedPaths = new Set(storedRepositories.map((repo) => repo.path));

    const worktreeRepositories = discoveredWorktrees
      .filter((worktree) => !storedPaths.has(worktree.path))
      .map((worktree) => {
        const repository = storedRepositories.find((repo) => repo.path === worktree.repositoryRootPath);
        const repositoryName = repository?.name ?? basename(worktree.repositoryRootPath);
        const worktreeOrigin: WorktreeOrigin = {
          repositoryRootPath: worktree.repositoryRootPath,
          repositoryName,
          name: worktree.name,
          displayName: `${repositoryName}: ${worktree.name}`,
        };

        return {
          id: Buffer.from(worktree.path).toString("base64"),
          name: worktreeOrigin.displayName,
          path: worktree.path,
          // Never opened through the extension, so it has no own visit date yet
          lastOpenedAt: 0,
          languageStats: repository?.languageStats,
          worktree: worktreeOrigin,
        } satisfies Repository;
      });

    return [...storedRepositories, ...worktreeRepositories];
  }, [storedRepositories, discoveredWorktrees]);

  // Revalidate all stored repositories in the list: remove if not valid
  useEffect(() => {
    let isCancelled = false;

    const validateStoredRepositories = async () => {
      const invalidPaths: string[] = [];
      const worktreesByRootPath = new Map<string, Awaited<ReturnType<GitManager["getWorktrees"]>>>();

      for (const repo of storedRepositories) {
        try {
          // Base validation: path exists and has a .git entry.
          GitManager.validateDirectory(repo.path);

          // Extra validation for linked worktrees:
          // ensure that this path is still listed by the repository root worktree registry.
          if (repo.worktree) {
            const rootPath = repo.worktree.repositoryRootPath;
            let rootWorktrees = worktreesByRootPath.get(rootPath);

            if (!rootWorktrees) {
              rootWorktrees = await new GitManager(rootPath).getWorktrees();
              worktreesByRootPath.set(rootPath, rootWorktrees);
            }

            const currentPath = realPath(repo.path);
            const existsInRegistry = rootWorktrees.some((worktree) => {
              if (worktree.isPrunable) return false;

              try {
                return realPath(worktree.path) === currentPath;
              } catch {
                return false;
              }
            });

            if (!existsInRegistry) {
              invalidPaths.push(repo.path);
            }
          }
        } catch {
          invalidPaths.push(repo.path);
        }
      }

      if (isCancelled || invalidPaths.length === 0) return;

      setRepositories((current) => current.filter((repo) => !invalidPaths.includes(repo.path)));
    };

    void validateStoredRepositories();

    return () => {
      isCancelled = true;
    };
  }, [storedRepositories, setRepositories]);

  /**
   * Adds a repository to the recent list.
   * Moves the repository to the top of the list (most recent position).
   * Resolves tilde (~) paths to absolute paths.
   */
  const addRepository = useCallback(
    async (path: string, cloning?: RepositoryCloningProcess) => {
      const resolvedPath = resolveTildePath(path).replace(/\/+$/, "");
      const stats = await detectRepositoryLanguages(resolvedPath);
      const worktree = readWorktreeOrigin(resolvedPath);

      setRepositories((currentRepositories) => {
        if (currentRepositories.some((repo) => repo.path === resolvedPath)) return currentRepositories;

        const newRepo: Repository = {
          id: Buffer.from(resolvedPath).toString("base64"),
          name: worktree?.displayName ?? basename(resolvedPath),
          path: resolvedPath,
          lastOpenedAt: Date.now(),
          languageStats: stats,
          cloning,
          worktree,
        };

        return [...currentRepositories, newRepo];
      });
    },
    [setRepositories],
  );

  const visitRepository = useCallback(
    async (repositoryPath: string) => {
      // Worktrees are listed without being stored, so only the stored list decides between add and update
      if (!storedRepositoriesRef.current.some((repo) => repo.path === repositoryPath)) {
        return addRepository(repositoryPath);
      }

      const stats = await detectRepositoryLanguages(repositoryPath);
      setRepositories((currentRepositories) =>
        currentRepositories.map((repo) =>
          repo.path === repositoryPath ? { ...repo, lastOpenedAt: Date.now(), languageStats: stats } : repo,
        ),
      );
    },
    [addRepository, setRepositories],
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

/**
 * Collects linked worktrees registered in the given repositories.
 * The main worktree is skipped because it is the repository itself.
 */
async function discoverWorktrees(repositoryPaths: string[]): Promise<DiscoveredWorktree[]> {
  const discovered: DiscoveredWorktree[] = [];

  for (const repositoryPath of repositoryPaths) {
    try {
      const gitManager = new GitManager(repositoryPath);
      if (!gitManager.hasLinkedWorktrees) continue;

      const worktrees = await gitManager.getWorktrees();
      const mainPath = realPath(repositoryPath);

      for (const worktree of worktrees) {
        if (worktree.isMain || worktree.isPrunable || realPath(worktree.path) === mainPath) continue;

        discovered.push({ repositoryRootPath: repositoryPath, path: worktree.path, name: worktree.name });
      }
    } catch {
      // Skip repositories whose worktrees cannot be read
    }
  }

  return discovered;
}

/**
 * Reads worktree metadata for a path; returns undefined for regular repositories.
 */
function readWorktreeOrigin(repositoryPath: string): WorktreeOrigin | undefined {
  try {
    return new GitManager(repositoryPath).worktreeOrigin;
  } catch {
    return undefined;
  }
}
