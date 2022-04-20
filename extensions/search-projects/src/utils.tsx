import { getPreferenceValues } from "@raycast/api";

import { useEffect, useState } from "react";
import { homedir } from "os";
import path from "path";
import fs from "fs";
import { Preferences, RepoSearchResponse, SourceRepo } from "./types";
import { Cache } from "./cache";
import { buildCache } from "./cache-builder";

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
        const repos = await buildCache(repoPaths, preferences.repoScanDepth ?? 3);

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
