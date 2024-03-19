import childProcess from "node:child_process";
import { homedir } from "node:os";
import { promisify } from "node:util";
import { getPreferenceValues } from "@raycast/api";

const exec = promisify(childProcess.exec);

// Find all of the repos in searchDir
export async function findRepos(searchDir: string): Promise<string[]> {
  // Use fd if possible and fallback to find
  const { stdout } = await exec(
    `fd --glob --hidden --no-ignore --max-depth=2 --type=directory '.git' '${searchDir}'`,
  ).catch((err) => {
    if (err instanceof Error && (err as Error & { code: number }).code === 127) {
      return exec(`find '${searchDir}' -type d -path '*/.git' -maxdepth 2`);
    }
    throw err;
  });

  return stdout
    .trim()
    .split("\n")
    .map((line) => line.slice(0, line.lastIndexOf("/.git")));
}

// Find all of the repos in searchDir that contain worktrees
async function findReposWithWorktrees(searchDir: string): Promise<string[]> {
  // Use fd if possible and fallback to find
  const { stdout } = await exec(
    `fd --glob --full-path --hidden --no-ignore --max-depth=3 --type=directory '**/.git/worktrees' '${searchDir}'`,
  ).catch((err) => {
    if (err instanceof Error && (err as Error & { code: number }).code === 127) {
      return exec(`find '${searchDir}' -type d -path '*/.git/worktrees' -maxdepth 3`);
    }
    throw err;
  });

  const output = stdout.trim();
  return output.length === 0
    ? []
    : output.split("\n").map((line) => line.slice(0, line.lastIndexOf("/.git/worktrees")));
}

export interface Worktree {
  path: string;
  commit: string | null;
  branch: string | null;
  dirty: boolean;
}

// Find all of the worktrees in a git repo
async function getRepoWorktrees(repoDir: string): Promise<Worktree[]> {
  const { stdout } = await exec(`git -C '${repoDir}' worktree list --porcelain`);
  const worktrees = stdout
    .trim()
    .split("\n\n")
    .map((section) => {
      let worktree: string | null = null;
      let commit: string | null = null;
      let branch: string | null = null;
      section.split("\n").forEach((line) => {
        if (line.startsWith("worktree ")) {
          worktree = line.slice(9);
        } else if (line.startsWith("HEAD ")) {
          commit = line.slice(5);
        } else if (line.startsWith("branch refs/heads/")) {
          branch = line.slice(18);
        }
      });

      if (!worktree) {
        throw new Error("Missing worktree!");
      }
      return {
        path: worktree,
        commit,
        branch,
        dirty: false,
      };
    })
    .filter(({ path }) => path !== repoDir);
  return Promise.all(
    worktrees.map(async (worktree) => {
      const { stdout } = await exec(`git -C '${worktree.path}' status -s`);
      return {
        ...worktree,
        dirty: stdout.trim().length > 0,
      };
    }),
  );
}

// Determine the default branch of a repo
export async function getBranches(repoDir: string): Promise<string[]> {
  const { stdout } = await exec(`git -C '${repoDir}' branch --format='%(refname:short)'`);
  return stdout
    .trim()
    .split("\n")
    .filter((branch) => !branch.startsWith("heads/"));
}

// Add a new git worktree
export async function addWorktree(
  repoDir: string,
  worktreeDir: string,
  branch: string,
  defaultBranch: string,
): Promise<void> {
  await exec(`git -C '${repoDir}' worktree add '${worktreeDir}' -b '${branch}' '${defaultBranch}'`);
}

// Remove a git worktree, throwing an exception if it failed
export async function removeWorktree(repoDir: string, worktreeDir: string): Promise<void> {
  await exec(`git -C '${repoDir}' worktree remove '${worktreeDir}'`);
}

type WorktreesMap = Record<string, Worktree[]>;

export async function getWorktrees(searchDir: string): Promise<WorktreesMap> {
  const repos = await findReposWithWorktrees(searchDir);
  const worktrees = await Promise.all(repos.map(async (repo) => [repo, await getRepoWorktrees(repo)] as const));
  return Object.fromEntries(worktrees);
}

const home = `${homedir()}/`;

// Return the directory containing the git repos specified in preferences
export function getRootDir(): string {
  const { rootDir } = getPreferenceValues<ExtensionPreferences>();
  return rootDir.replace("~/", home);
}

// Prettify a path for display in the UI
export function formatPath(path: string): string {
  if (path.startsWith(home)) {
    return path.replace(home, "~/");
  }
  return path;
}
