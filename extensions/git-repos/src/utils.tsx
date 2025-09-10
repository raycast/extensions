import { getPreferenceValues, showToast, LocalStorage, Toast } from "@raycast/api";

import { homedir } from "os";
import path from "path";
import fs from "fs";
import { promisify } from "util";
import { exec } from "child_process";
const execp = promisify(exec);
import parseGitConfig = require("parse-git-config");
import parseGithubURL = require("parse-github-url");
import getDefaultBrowser from "default-browser";

export interface OpenWith {
  name: string;
  path: string;
  bundleId: string;
}

export interface Preferences {
  repoScanPath: string;
  repoScanDepth?: number;
  includeSubmodules?: boolean;
  searchKeys?: string;
  openWith1: OpenWith;
  openWith2: OpenWith;
  openWith3?: OpenWith;
  openWith4?: OpenWith;
  openWith5?: OpenWith;
}

export enum GitRepoType {
  All = "All",
  Repo = "Repo",
  Submodule = "Submodule",
  Worktree = "Worktree",
}

export interface GitRepo {
  name: string;
  fullPath: string;
  icon: string;
  defaultBrowserId: string;
  repoType: GitRepoType;
  remotes: RemoteRepo[];
}

export interface RemoteRepo {
  name: string;
  host: string;
  url: string;
}

interface GitRemote {
  url: string;
}

function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export class GitRepoService {
  private static favoritesStorageKey = "git-repos-favorites";

  static async gitRepos(): Promise<GitRepo[]> {
    const preferences = getPreferences();
    if (preferences.repoScanPath.length == 0) {
      showToast(Toast.Style.Failure, "", "Directories to scan has not been defined in settings");
      return [];
    }
    const [repoPaths, unresolvedPaths] = parsePath(preferences.repoScanPath);
    if (unresolvedPaths.length > 0) {
      showToast(
        Toast.Style.Failure,
        "",
        `Director${unresolvedPaths.length === 1 ? "y" : "ies"} not found: ${unresolvedPaths}`
      );
    }
    const repos = await findRepos(repoPaths, preferences.repoScanDepth ?? 3, preferences.includeSubmodules ?? false);

    return repos;
  }

  static async favorites(): Promise<string[]> {
    const favoritesItem: string | undefined = await LocalStorage.getItem(GitRepoService.favoritesStorageKey);
    if (favoritesItem) {
      return JSON.parse(favoritesItem) as string[];
    } else {
      return [];
    }
  }

  static async addToFavorites(repo: GitRepo) {
    const favorites = await GitRepoService.favorites();
    favorites.push(repo.fullPath);
    await GitRepoService.saveFavorites(favorites);
  }

  static async removeFromFavorites(repo: GitRepo) {
    let favorites = await GitRepoService.favorites();
    favorites = favorites.filter((favorite) => favorite !== repo.fullPath);
    await GitRepoService.saveFavorites(favorites);
  }

  private static async saveFavorites(favorites: string[]) {
    await LocalStorage.setItem(GitRepoService.favoritesStorageKey, JSON.stringify(favorites));
  }
}

function resolveGitPath(repoPath: string): string {
  const gitPath = path.join(repoPath, ".git");

  try {
    const stats = fs.statSync(gitPath);

    if (stats.isFile()) {
      const content = fs.readFileSync(gitPath, "utf8").trim();
      const match = content.match(/^gitdir:\s*(.+)$/);

      if (match) {
        const gitDirPath = match[1];
        const basePath = path.dirname(gitPath);
        return path.resolve(basePath, gitDirPath);
      }
    }

    return gitPath;
  } catch {
    return gitPath;
  }
}

function resolveGitConfig(repoPath: string): string {
  return path.join(resolveGitPath(repoPath), "config");
}

function gitRemotes(path: string): RemoteRepo[] {
  let repos = [] as RemoteRepo[];
  const gitConfig = parseGitConfig.sync({ cwd: path, path: resolveGitConfig(path), expandKeys: true });
  if (gitConfig.remote != null) {
    for (const remoteName in gitConfig.remote) {
      const config = gitConfig.remote[remoteName] as GitRemote;
      const parsed = parseGithubURL(config.url);
      if (parsed?.host && parsed?.repo) {
        repos = repos.concat({
          name: remoteName,
          host: parsed?.host,
          url: `https://${parsed?.host}/${parsed?.repo}`,
        });
      }
    }
  }
  return repos;
}

export function resolvePath(filepath: string): string {
  if (filepath.length > 0 && filepath[0] === "~") {
    return path.join(homedir(), filepath.slice(1));
  }
  return filepath;
}

export function tildifyPath(p: string): string {
  const normalizedPath = path.normalize(p) + path.sep;

  return (
    normalizedPath.indexOf(homedir()) === 0
      ? normalizedPath.replace(homedir() + path.sep, `~${path.sep}`)
      : normalizedPath
  ).slice(0, -1);
}

export function parsePath(path: string): [string[], string[]] {
  const resolvedPaths: string[] = [];
  const unresolvedPaths: string[] = [];
  const paths = path.split(":");
  paths.map((path) => {
    path = path.trim();
    if (path.length === 0) {
      return;
    }
    const pathToVerify = resolvePath(path.trim());
    try {
      fs.accessSync(pathToVerify, fs.constants.R_OK);
      resolvedPaths.push(pathToVerify);
    } catch (err) {
      unresolvedPaths.push(path);
    }
  });
  return [resolvedPaths, unresolvedPaths];
}

function parseRepoPaths(mainPath: string, repoPaths: string[], submodules = false): GitRepo[] {
  if (submodules) {
    return repoPaths
      .filter((path) => fs.existsSync(path))
      .map((path) => {
        const fullPath = path;
        const name = `${fullPath.split("/").pop() ?? "unknown"}`;
        const remotes = gitRemotes(fullPath);
        return {
          name: name,
          icon: "git-submodule-icon.png",
          fullPath: fullPath,
          defaultBrowserId: "",
          repoType: GitRepoType.Submodule,
          remotes: remotes,
        };
      });
  } else {
    return repoPaths.map((repoPath) => {
      const fullPath = path.dirname(repoPath);
      const name = fullPath.split("/").pop() ?? "unknown";
      const remotes = gitRemotes(fullPath);
      return {
        name: name,
        icon: "git-icon.png",
        fullPath: fullPath,
        defaultBrowserId: "",
        repoType: GitRepoType.Repo,
        remotes: remotes,
      };
    });
  }
}

async function findSubmodules(path: string): Promise<string[]> {
  const { stdout } = await execp(
    `grep -E "^\\s+path\\s*="  ${
      path.replace(/(\s+)/g, "\\$1") + "/.gitmodules"
    } | sed -E "s%[[:space:]]+path[[:space:]]*=[[:space:]]*%\${1%/.git}/%g"`
  );
  const paths = stdout.split("\n").filter((e) => e);
  const submodulePaths = paths.map((subPath) => {
    const temp = `${path}${subPath}`;
    return temp;
  });
  return submodulePaths;
}

async function findWorktrees(path: string, maxDepth: number): Promise<GitRepo[]> {
  let foundRepos: GitRepo[] = [];
  const findCmd = `find -L ${path.replace(/(\s+)/g, "\\$1")} -maxdepth ${maxDepth} -name .git -type f -print || true`;
  const { stdout, stderr } = await execp(findCmd);
  const filteredStderr = stderr
    .split("\n")
    .filter((line) => !/Permission denied|Operation not permitted/.test(line))
    .join("\n");
  if (!filteredStderr) {
    const repoPaths = stdout.split("\n").filter((e) => e);
    const repos = parseRepoPaths(path, repoPaths, false);
    foundRepos = foundRepos.concat(repos);
    foundRepos.map((repo) => ((repo.icon = "git-worktree-icon.png"), (repo.repoType = GitRepoType.Worktree)));
  }
  return foundRepos;
}

export async function findRepos(paths: string[], maxDepth: number, includeSubmodules: boolean): Promise<GitRepo[]> {
  let foundRepos: GitRepo[] = [];
  await Promise.allSettled(
    paths.map(async (path) => {
      const findCmd = `find -L ${path.replace(
        /(\s+)/g,
        "\\$1"
      )} -maxdepth ${maxDepth} -type d -name .git -print || true`;
      const { stdout, stderr } = await execp(findCmd);
      const filteredStderr = stderr
        .split("\n")
        .filter((line) => !/Permission denied|Operation not permitted/.test(line))
        .join("\n");
      if (filteredStderr) {
        showToast(Toast.Style.Failure, "Find Failed", stderr);
        return [];
      }
      const repoPaths = stdout.split("\n").filter((e) => e);
      const repos = parseRepoPaths(path, repoPaths, false);
      if (includeSubmodules) {
        let subRepoPaths: string[] = [];
        await Promise.allSettled(
          repos.map(async (repo) => {
            const subP = await findSubmodules(repo.fullPath);
            if (subP.length > 0) {
              subRepoPaths = subRepoPaths.concat(subP);
            }
          })
        );
        const subRepos = parseRepoPaths(path, subRepoPaths, true);
        foundRepos = foundRepos.concat(repos.concat(subRepos));
      } else {
        foundRepos = foundRepos.concat(repos);
      }
      // Search for git worktrees
      const worktrees = await findWorktrees(path, maxDepth);
      worktrees.forEach(function (worktree) {
        // Only add if a repo.fullPath is not already in array
        const found = foundRepos.findIndex((r) => r.fullPath === worktree.fullPath);
        if (found === -1) {
          foundRepos.push(worktree);
        }
      });
    })
  );
  foundRepos.sort((a, b) => {
    const fa = a.name.toLowerCase(),
      fb = b.name.toLowerCase();
    if (fa < fb) {
      return -1;
    }
    if (fa > fb) {
      return 1;
    }
    return 0;
  });
  try {
    const defaultBrowser = await getDefaultBrowser();
    foundRepos.map((repo) => {
      repo.defaultBrowserId = defaultBrowser.id;
    });
  } catch (e) {
    // ignore, repo.defaultBrowserId will stay as ""
  }

  return foundRepos;
}
