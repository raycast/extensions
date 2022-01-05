import { environment, preferences, showToast, ToastStyle } from "@raycast/api";

import { useEffect, useState } from "react";
import { homedir } from "os";
import path from "path";
import fs from "fs";
import { promisify } from "util";
import { exec } from "child_process";
const execp = promisify(exec);
import parseGitConfig = require("parse-git-config");
import parseGithubURL = require("parse-github-url");

const CacheFile = path.join(environment.supportPath, "cache.json");

export interface GitRepo {
  name: string;
  fullPath: string;
  icon: string;
}

interface GitRemote {
  url: string;
}

export interface RemoteRepo {
  name: string;
  host: string;
  url: string;
}

export class Cache {
  repos: GitRepo[];

  constructor() {
    makeSupportPath();
    this.repos = [];
    try {
      fs.accessSync(CacheFile, fs.constants.R_OK);
    } catch (err) {
      return;
    }
    const jsonData = fs.readFileSync(CacheFile).toString();
    if (jsonData.length > 0) {
      const cache: Cache = JSON.parse(jsonData);
      this.repos = cache.repos;
    }
  }

  save(): void {
    const jsonData = JSON.stringify(this, null, 2) + "\n";
    fs.writeFileSync(CacheFile, jsonData);
  }

  setRepos(repos: GitRepo[]): void {
    this.repos = repos;
  }

  clear(): void {
    this.repos = [];
    this.save();
  }
}

export interface RepoSearchResponse {
  sectionTitle: string;
  repos: GitRepo[];
}

export interface Settings {
  reposDir: string;
  maxDepth: number;
  includeSubmodules: boolean;
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

function makeSupportPath() {
  fs.mkdirSync(environment.supportPath, { recursive: true });
}

export async function loadSettings(): Promise<Settings> {
  return {
    reposDir: preferences.repoScanPath?.value as string,
    maxDepth: (preferences.repoScanDepth?.value as number) ?? 3,
    includeSubmodules: preferences.includeSubmodules?.value as boolean,
  };
}

export function gitRemotes(path: string): RemoteRepo[] {
  let repos = [] as RemoteRepo[];
  const gitConfig = parseGitConfig.sync({ cwd: path, path: ".git/config", expandKeys: true });
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
        return { name: name, icon: "git-submodule-icon.png", fullPath: fullPath };
      });
  } else {
    return repoPaths.map((path) => {
      const fullPath = path.replace("/.git", "");
      const name = fullPath.split("/").pop() ?? "unknown";
      return { name: name, icon: "git-icon.png", fullPath: fullPath };
    });
  }
}

export async function findRepos(paths: string[], maxDepth: number, includeSubmodules: boolean): Promise<GitRepo[]> {
  const cache = new Cache();
  let foundRepos: GitRepo[] = [];
  await Promise.allSettled(
    paths.map(async (path) => {
      const findCmd = `find -L ${path} -maxdepth ${maxDepth} -name .git -type d`;
      const { stdout, stderr } = await execp(findCmd);
      if (stderr) {
        showToast(ToastStyle.Failure, "Find Failed", stderr);
        console.error(`error: ${stderr}`);
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
  cache.setRepos(foundRepos);
  cache.save();
  return foundRepos;
}

async function findSubmodules(path: string): Promise<string[]> {
  const { stdout } = await execp(
    `grep "\\[submodule"  ${path + "/.gitmodules"} | sed "s%\\[submodule \\"%\${1%/.git}/%g" | sed "s/\\"]//g"`
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
  const findCmd = `find -L ${path} -maxdepth ${maxDepth} -name .git -type f`;
  const { stdout, stderr } = await execp(findCmd);
  if (!stderr) {
    const repoPaths = stdout.split("\n").filter((e) => e);
    const repos = parseRepoPaths(path, repoPaths, false);
    foundRepos = foundRepos.concat(repos);
    foundRepos.map((repo) => (repo.icon = "git-worktree-icon.png"));
  }
  return foundRepos;
}

export function useRepoCache(query: string | undefined): {
  response?: RepoSearchResponse;
  error?: string;
  isLoading: boolean;
} {
  const [response, setResponse] = useState<RepoSearchResponse>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetched, setIsFetched] = useState<boolean>(false);
  const cache = new Cache();

  let cancel = false;
  let repos = cache.repos;

  function filterRepos(repos: GitRepo[], query: string): GitRepo[] {
    return repos.filter((repo) => repo.name.toLocaleLowerCase().includes(query.toLowerCase()));
  }

  useEffect(() => {
    async function fetchRepos() {
      if (cancel || fetched) {
        return;
      }
      setError(undefined);

      try {
        const settings = await loadSettings();
        if (settings.reposDir.length == 0) {
          setError("Directories to scan has not been defined in settings");
          return;
        }
        const [repoPaths, unresolvedPaths] = parsePath(settings.reposDir);
        if (unresolvedPaths.length > 0) {
          setError(`Director${unresolvedPaths.length === 1 ? "y" : "ies"} not found: ${unresolvedPaths}`);
        }
        const repos = await findRepos(repoPaths, settings.maxDepth, settings.includeSubmodules);

        if (!cancel) {
          let filteredRepos = repos;
          let sectionTitle = `${filteredRepos.length} Repo${filteredRepos.length != 1 ? "s" : ""}`;
          if (query && query?.length > 0) {
            filteredRepos = filterRepos(filteredRepos, query);
            sectionTitle = `${filteredRepos.length} Repo${filteredRepos.length != 1 ? "s" : ""} Found`;
          }
          setResponse({ sectionTitle: sectionTitle, repos: filteredRepos });
          setIsFetched(true);
        }
      } catch (e) {
        if (!cancel) {
          setError(e as string);
        }
      } finally {
        if (!cancel) {
          setIsLoading(false);
        }
      }
    }

    let sectionTitle = `${repos.length} Repo${repos.length != 1 ? "s" : ""}`;
    if (query && query.length > 0) {
      repos = filterRepos(repos, query);
      sectionTitle = `${repos.length} Repo${repos.length != 1 ? "s" : ""} Found`;
    }

    if (cache.repos.length > 0) {
      setResponse({ sectionTitle: sectionTitle, repos: repos });
    }

    if (!fetched) {
      fetchRepos();
    }

    return () => {
      cancel = true;
    };
  }, [query]);

  return { response, error, isLoading };
}
