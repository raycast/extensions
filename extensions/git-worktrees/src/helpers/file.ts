import { ignoredDirectories } from "#/config";
import { CACHE_KEYS } from "#/config/constants";
import { BareRepository, Project, Worktree } from "#/config/types";
import { Cache } from "@raycast/api";
import fg from "fast-glob";
import { statSync } from "node:fs";
import { rm } from "node:fs/promises";
import { homedir } from "node:os";
import { getDataFromCache, storeDataInCache } from "./cache";
import { batchPromises, executeCommand } from "./general";
import { isInsideBareRepository, parseGitRemotes } from "./git";
import { getPreferences } from "./raycast";

const findDirectories = async ({
  searchDir,
  depth = +getPreferences().maxScanningLevels * 2,
  pattern,
}: {
  searchDir: string;
  depth?: number;
  pattern: string;
}): Promise<string[]> => {
  try {
    const excludedDirectories = ignoredDirectories.map((folder) => `--exclude ${folder}`).join(" ");
    const args = `--glob --full-path --hidden --no-ignore --max-depth=${depth} --type=directory '${pattern}' '${searchDir}' ${excludedDirectories}`;

    let result = "";

    try {
      const { stdout } = await executeCommand(`fd ${args}`);
      result = stdout;
    } catch {
      const { stdout } = await executeCommand(`/opt/homebrew/bin/fd ${args}`);
      result = stdout;
    }

    return result.trim().split("\n");
  } catch {
    return fg(`${searchDir}/${pattern}`, {
      dot: true,
      ignore: ignoredDirectories.map((folder) => `**/${folder}/**`),
      onlyDirectories: true,
      deep: depth,
    });
  }
};

export const findBareRepos = async (searchDir: string): Promise<BareRepository[]> => {
  const bareRepositories = await findDirectories({ searchDir, pattern: "**/.bare" });

  const validBareRepos = (
    await batchPromises(bareRepositories, 10, async (path) => {
      const newPath = path.slice(0, path.lastIndexOf("/.bare"));
      const insideBare = await isInsideBareRepository(newPath);
      return insideBare ? newPath : null;
    })
  ).filter((path) => path !== null);

  return batchPromises(validBareRepos, 10, async (path) => {
    const pathParts = path.split("/").slice(3);

    return {
      name: pathParts.at(-1) || "",
      displayPath: formatPath(path),
      fullPath: path,
      pathParts,
      primaryDirectory: pathParts.at(-2) || "",
      gitRemotes: await parseGitRemotes(path),
    };
  });
};

export const getRepoWorktrees = async (bareDirectory: string): Promise<Worktree[]> => {
  const { stdout } = await executeCommand(`git worktree list --porcelain`, { cwd: bareDirectory });

  const worktrees = stdout
    .trim()
    .split("\n\n")
    .map((path): Worktree => {
      let worktree: string | null = null;
      let commit: string | null = null;
      let branch: string | null = null;

      path.split("\n").forEach((line) => {
        if (line.startsWith("worktree ")) {
          worktree = line.slice(9);
        } else if (line.startsWith("HEAD ")) {
          commit = line.slice(5);
        } else if (line.startsWith("branch refs/heads/")) {
          branch = line.slice(18);
        }
      });

      if (!worktree) throw new Error("Missing worktree!");

      return {
        id: worktree,
        path: worktree,
        commit,
        branch,
        dirty: false,
      };
    })
    .filter(({ path }) => !path.endsWith(".bare") && path.startsWith(bareDirectory)); // Filter out bare worktree and worktrees that are not in the bare directory e.g have been manually moved

  return batchPromises(worktrees, 25, async (worktree) => ({
    ...worktree,
    dirty: await isWorktreeDirty(worktree.path),
  }));
};

export const isWorktreeDirty = async (path: string): Promise<boolean> => {
  try {
    const { stdout } = await executeCommand(`git -C ${path} status -s`);
    return stdout.trim().length > 0;
  } catch (e: unknown) {
    console.error({ path, e });
  }
  return false;
};

export async function getWorktrees(searchDir: string): Promise<Project[]> {
  const repos = await getDirectoriesFromCacheOrFetch(searchDir);

  return batchPromises(repos, 15, async (repo) => ({
    ...repo,
    id: repo.fullPath,
    worktrees: await getRepoWorktrees(repo.fullPath),
  }));
}

export const getDirectoriesFromCacheOrFetch = async (searchDir: string) => {
  const cache = new Cache();

  const { enableWorktreeCaching } = getPreferences();

  if (!enableWorktreeCaching) return findBareRepos(searchDir);

  if (cache.has(CACHE_KEYS.DIRECTORIES))
    return JSON.parse(cache.get(CACHE_KEYS.DIRECTORIES) as string) as BareRepository[];

  const directories = await findBareRepos(searchDir);
  cache.remove(CACHE_KEYS.DIRECTORIES);
  cache.set(CACHE_KEYS.DIRECTORIES, JSON.stringify(directories));

  return directories;
};

export const getWorktreeFromCacheOrFetch = async (searchDir: string) => {
  const cache = new Cache();

  const { enableWorktreeCaching } = getPreferences();

  if (!enableWorktreeCaching) return getWorktrees(searchDir);

  const lastProjectDirectory = getDataFromCache<string>(CACHE_KEYS.LAST_PROJECT_DIR);
  if (lastProjectDirectory !== searchDir) {
    cache.clear();
    storeDataInCache(CACHE_KEYS.LAST_PROJECT_DIR, searchDir);
    return getWorktrees(searchDir);
  }

  if (cache.has(CACHE_KEYS.WORKTREES)) return JSON.parse(cache.get(CACHE_KEYS.WORKTREES) as string) as Project[];

  const worktrees = await getWorktrees(searchDir);
  cache.remove(CACHE_KEYS.WORKTREES);
  cache.set(CACHE_KEYS.WORKTREES, JSON.stringify(worktrees));

  return worktrees;
};

const home = `${homedir()}/`;

// Prettify a path for display in the UI
export function formatPath(path: string): string {
  if (path.startsWith(home)) {
    return path.replace(home, "~/");
  }
  return path;
}

/**
 * Checks if the provided path is an existing directory
 * @param {string} path - The path to be checked
 * @returns {boolean} True if the path is an existing directory, otherwise false
 */
export const isExistingDirectory = (path: string): boolean => {
  try {
    const newPath = statSync(path);
    return newPath?.isDirectory();
  } catch {
    return false;
  }
};

export const removeDirectory = ({
  path,
  recursive = true,
  force = true,
}: {
  path: string;
  recursive?: boolean;
  force?: boolean;
}) => {
  return rm(path, { recursive, force });
};
