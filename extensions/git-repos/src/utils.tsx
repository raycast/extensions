import { getPreferenceValues, showToast, LocalStorage, Toast } from "@raycast/api";

import { homedir, platform } from "os";
import path from "path";
import fs from "fs";
import { glob, Path } from "glob";
import parseGitConfig from "parse-git-config";
import parseGithubURL from "parse-github-url";
import getDefaultBrowser from "default-browser";

export enum Platform {
  macOS = "darwin",
  Windows = "win32",
}

const pathSeparator: Record<Platform, string> = {
  [Platform.macOS]: ":",
  [Platform.Windows]: ";",
};

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

export class GitRepoService {
  private static favoritesStorageKey = "git-repos-favorites";

  static async gitRepos(): Promise<GitRepo[]> {
    const preferences = getPreferenceValues<Preferences>();
    if (preferences.repoScanPath.length == 0) {
      showToast(Toast.Style.Failure, "", "Directories to scan has not been defined in settings");
      return [];
    }
    const [repoPaths, unresolvedPaths] = parsePath(preferences.repoScanPath);
    if (unresolvedPaths.length > 0) {
      showToast(
        Toast.Style.Failure,
        "",
        `Director${unresolvedPaths.length === 1 ? "y" : "ies"} not found: ${unresolvedPaths}`,
      );
    }
    const repos = await findRepos(
      repoPaths,
      parseInt(preferences.repoScanDepth, 10) || 3,
      preferences.includeSubmodules ?? false,
    );

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
  const separator = pathSeparator[platform() as Platform] ?? ":";
  const paths = path.split(separator);
  paths.map((path) => {
    path = path.trim();
    if (path.length === 0) {
      return;
    }
    const pathToVerify = resolvePath(path.trim());
    try {
      fs.accessSync(pathToVerify, fs.constants.R_OK);
      resolvedPaths.push(pathToVerify);
    } catch {
      unresolvedPaths.push(path);
    }
  });
  return [resolvedPaths, unresolvedPaths];
}

function parseRepoPaths(mainPath: string, repoPaths: string[], submodules = false): GitRepo[] {
  if (submodules) {
    return repoPaths
      .filter((submodulePath) => fs.existsSync(submodulePath))
      .map((submodulePath) => {
        const fullPath = submodulePath;
        const name = path.basename(fullPath) || "unknown";
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
      const name = path.basename(fullPath) || "unknown";
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

function findSubmodules(repoPath: string): string[] {
  const gitmodulesPath = path.join(repoPath, ".gitmodules");
  try {
    const content = fs.readFileSync(gitmodulesPath, "utf8");
    const submodulePaths: string[] = [];
    for (const line of content.split("\n")) {
      const match = line.match(/^\s+path\s*=\s*(.+)$/);
      if (match) {
        submodulePaths.push(path.join(repoPath, match[1].trim()));
      }
    }
    return submodulePaths;
  } catch {
    return [];
  }
}

export async function findRepos(paths: string[], maxDepth: number, includeSubmodules: boolean): Promise<GitRepo[]> {
  let foundRepos: GitRepo[] = [];
  await Promise.allSettled(
    paths.map(async (scanPath) => {
      const gitEntries = (await glob("**/.git", {
        cwd: scanPath,
        maxDepth,
        follow: true,
        withFileTypes: true,
        dot: true,
      })) as Path[];
      const gitDirs = gitEntries.filter((p) => p.isDirectory()).map((p) => p.fullpath());
      const gitFiles = gitEntries.filter((p) => p.isFile()).map((p) => p.fullpath());

      const repos = parseRepoPaths(scanPath, gitDirs, false);
      const worktrees = parseRepoPaths(scanPath, gitFiles, false).map((repo) => ({
        ...repo,
        icon: "git-worktree-icon.png",
        repoType: GitRepoType.Worktree,
      }));
      if (includeSubmodules) {
        let subRepoPaths: string[] = [];
        repos.forEach((repo) => {
          const subP = findSubmodules(repo.fullPath);
          if (subP.length > 0) {
            subRepoPaths = subRepoPaths.concat(subP);
          }
        });
        const subRepos = parseRepoPaths(scanPath, subRepoPaths, true);
        foundRepos = foundRepos.concat(repos.concat(subRepos));
      } else {
        foundRepos = foundRepos.concat(repos);
      }
      // Only add if this worktree path hasn't already been added as a regular repo
      worktrees.forEach((worktree) => {
        if (foundRepos.findIndex((r) => r.fullPath === worktree.fullPath) === -1) {
          foundRepos.push(worktree);
        }
      });
    }),
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
  } catch {
    // ignore, repo.defaultBrowserId will stay as ""
  }

  return foundRepos;
}
