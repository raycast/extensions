import { ignoredDirectories } from "#/config";
import { BareRepository, Project, Worktree } from "#/config/types";
import fg from "fast-glob";
import { statSync } from "node:fs";
import { rm } from "node:fs/promises";
import { homedir } from "node:os";
import { batchPromises, executeShellCommand } from "./general";
import { isInsideBareRepository, parseGitRemotes } from "./git";
import { getPreferences } from "./raycast";
import { type Options as ExecaOptions } from "execa";

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
    const result = await fg(`${searchDir}/${pattern}`, {
      dot: true,
      ignore: ignoredDirectories.map((folder) => `**/${folder}/**`),
      onlyDirectories: true,
      deep: depth,
    });

    return result;
  } catch {
    return [];
  }
};

export const findProjects = async (searchDir: string): Promise<BareRepository[]> => {
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

export const getRepoWorktrees = async (
  bareDirectory: string,
  opts: { signal: ExecaOptions["cancelSignal"] },
): Promise<Worktree[]> => {
  const { stdout } = await executeShellCommand(`git worktree list --porcelain`, {
    cwd: bareDirectory,
    cancelSignal: opts.signal,
  });

  if (typeof stdout !== "string") return [];

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
    const { stdout } = await executeShellCommand(`git -C "${path}" status -s`);
    if (typeof stdout !== "string") return false;
    return stdout.trim().length > 0;
  } catch (e: unknown) {
    console.error({ path, e });
  }
  return false;
};

export async function getWorktrees(
  searchDir: string,
  opts: { signal: ExecaOptions["cancelSignal"] },
): Promise<Project[]> {
  const repos = await findProjects(searchDir);

  return batchPromises(repos, 15, async (repo) => ({
    ...repo,
    id: repo.fullPath,
    worktrees: await getRepoWorktrees(repo.fullPath, opts),
  }));
}

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
