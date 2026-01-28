import { getPreferenceValues } from "@raycast/api";

import { useEffect, useState } from "react";
import { homedir } from "os";
import path from "path";
import fs from "fs";
import { CacheType, Preferences, ProjectTypeConfig, RepoSearchResponse, SourceRepo } from "./types";
import { ApplicationCache } from "./cache/application-cache";
import { buildAllProjectsCache } from "./cache/all-projects-cache-builder-v2";
import { getRepoKey, isProjectTypeEnabled } from "./common-utils";
import applicationConfig from "./application-config.json";

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

  const allProjectsCache = new ApplicationCache(CacheType.ALL_PROJECTS);
  const recentlyAccessedCache = new ApplicationCache(CacheType.RECENT_PROJECTS);
  const pinnedCache = new ApplicationCache(CacheType.PINNED_PROJECTS);

  let cancel = false;
  const repos = allProjectsCache.repos;
  let enabledProjectTypes: string[] = [];

  function filterRepos(repos: SourceRepo[], query: string): SourceRepo[] {
    const queries = query.split(" ");
    const dir = queries.filter((q) => q.startsWith("dir:") && q.split(":").length > 1)[0]?.split(":")[1];
    const type = queries.filter((q) => q.startsWith("type:") && q.split(":").length > 1)[0]?.split(":")[1];
    const name = queries.filter((q) => !q.includes(":"))[0];
    let filteredRepos: SourceRepo[] = repos;
    if (dir) {
      filteredRepos = filteredRepos.filter((repo) =>
        repo.fullPath.toLocaleLowerCase().includes(dir.trim().toLowerCase())
      );
    }

    if (type) {
      filteredRepos = filteredRepos.filter((repo) => repo.type.toLocaleLowerCase().includes(type.trim().toLowerCase()));
    }

    if (name) {
      filteredRepos = filteredRepos.filter((repo) => repo.name.toLocaleLowerCase().includes(name.trim().toLowerCase()));
    }

    return filteredRepos;
  }

  function filterAndSetFullResponse(repos: SourceRepo[]): void {
    let filteredAllRepos = repos;
    let filteredRecentRepos = recentlyAccessedCache.repos;
    let filteredPinnedRepos = pinnedCache.repos;

    if (enabledProjectTypes?.length > 0) {
      filteredAllRepos = filteredAllRepos.filter((repo) => enabledProjectTypes.includes(repo.type));
      filteredRecentRepos = filteredRecentRepos.filter((repo) => enabledProjectTypes.includes(repo.type));
      filteredPinnedRepos = filteredPinnedRepos.filter((repo) => enabledProjectTypes.includes(repo.type));
    }

    if (query && query.length > 0) {
      filteredAllRepos = filterRepos(filteredAllRepos, query);
      filteredRecentRepos = filterRepos(filteredRecentRepos, query);
      filteredPinnedRepos = filterRepos(filteredPinnedRepos, query);
    }

    const allButRecentRepos = [...filteredAllRepos].filter((all) => {
      return !filteredRecentRepos.some((recent) => {
        return getRepoKey(all) === getRepoKey(recent);
      });
    });

    setResponse({
      all: {
        sectionTitle: `${filteredAllRepos.length} project${filteredAllRepos.length != 1 ? "s" : ""} Found`,
        repos: allButRecentRepos || [],
      },
      recent:
        filteredRecentRepos?.length > 0
          ? {
              sectionTitle: `Recent project${filteredRecentRepos?.length != 1 ? "s" : ""}`,
              repos: filteredRecentRepos || [],
            }
          : undefined,
      pinned:
        filteredPinnedRepos?.length > 0
          ? {
              sectionTitle: `Pinned project${filteredRecentRepos?.length != 1 ? "s" : ""}`,
              repos: filteredPinnedRepos || [],
            }
          : undefined,
    });
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

        const repos = await buildAllProjectsCache(repoPaths, preferences);

        enabledProjectTypes = (applicationConfig.projectTypes as ProjectTypeConfig[])
          .filter((project) => isProjectTypeEnabled(project.openWithKey, preferences))
          .map((project) => project.type);

        if (!cancel) {
          filterAndSetFullResponse(repos);
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

    filterAndSetFullResponse(repos);

    if (!fetched) {
      fetchRepos();
    }

    return () => {
      cancel = true;
    };
  }, [query]);

  return { response, error, isLoading };
}
