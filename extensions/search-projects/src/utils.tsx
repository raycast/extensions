import { environment, getPreferenceValues, showToast, Toast } from "@raycast/api";

import { useEffect, useState } from "react";
import { homedir } from "os";
import path from "path";
import fs from "fs";
import { promisify } from "util";
import { exec } from "child_process";
const execp = promisify(exec);
const CacheFile = path.join(environment.supportPath, "cache.json");

export interface SourceRepo {
  name: string;
  fullPath: string;
  icon: string;
}

export class Cache {
  repos: SourceRepo[];

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

  setRepos(repos: SourceRepo[]): void {
    this.repos = repos;
  }

  clear(): void {
    this.repos = [];
    this.save();
  }
}

export interface RepoSearchResponse {
  sectionTitle: string;
  repos: SourceRepo[];
}

export interface OpenWith {
  name: string;
  path: string;
  bundleId: string;
}

export interface Preferences {
  repoScanPath: string;
  repoScanDepth?: number;
  openWith1: OpenWith;
  openWith2: OpenWith;
  openWith3?: OpenWith;
  openWith4?: OpenWith;
  openWith5?: OpenWith;
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

export async function loadPreferences(): Promise<Preferences> {
  return getPreferenceValues<Preferences>();
}

function parsePath(path: string): [string[], string[]] {
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

function parseRepoPaths(repoPaths: string[]): SourceRepo[] {
  return repoPaths.map((path) => {
    const fullPath = path.replace("/package.json", "");
    const name = fullPath.split("/").pop() ?? "unknown";
    return { name: name, icon: "node-js.png", fullPath: fullPath };
  });
}

export async function findRepos(paths: string[], maxDepth: number): Promise<SourceRepo[]> {
  const cache = new Cache();
  let foundRepos: SourceRepo[] = [];
  await Promise.allSettled(
    paths.map(async (path) => {
      const findCmd = `find -L ${path} -maxdepth ${maxDepth} -name package.json -type f -not -path "*/node_modules/*"`;
      const { stdout, stderr } = await execp(findCmd);
      if (stderr) {
        showToast(Toast.Style.Failure, "Find Failed", stderr);
        console.error(`error: ${stderr}`);
        return [];
      }
      const repoPaths = stdout.split("\n").filter((e) => e);
      const repos = parseRepoPaths(repoPaths);
      foundRepos = foundRepos.concat(repos);
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

  function filterRepos(repos: SourceRepo[], query: string): SourceRepo[] {
    return repos.filter((repo) => repo.name.toLocaleLowerCase().includes(query.toLowerCase()));
  }

  useEffect(() => {
    async function fetchRepos() {
      if (cancel || fetched) {
        return;
      }
      setError(undefined);

      try {
        const preferences = await loadPreferences();
        if (preferences.repoScanPath.length == 0) {
          setError("Directories to scan has not been defined in settings");
          return;
        }
        const [repoPaths, unresolvedPaths] = parsePath(preferences.repoScanPath);
        if (unresolvedPaths.length > 0) {
          setError(`Director${unresolvedPaths.length === 1 ? "y" : "ies"} not found: ${unresolvedPaths}`);
        }
        const repos = await findRepos(repoPaths, preferences.repoScanDepth ?? 3);

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
