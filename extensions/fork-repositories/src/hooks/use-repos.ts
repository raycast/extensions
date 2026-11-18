import { existsSync, readFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { useCachedPromise } from "@raycast/utils";
import * as TOML from "@iarna/toml";

type TomlRepo = Partial<Repo> & { opened?: number };
type TomlRepoFile = {
  repository?: TomlRepo[];
  repositories?: TomlRepo[];
};

const resolveRepoFilePath = (repoFilePaths: string[]): string | undefined =>
  repoFilePaths.find((repoFilePath) => existsSync(repoFilePath));

const parseRepoItems = (rawData: string, repoFilePath: string): TomlRepo[] => {
  const data =
    extname(repoFilePath).toLowerCase() === ".toml"
      ? (TOML.parse(rawData) as unknown as TomlRepoFile)
      : (JSON.parse(rawData) as RepoFile);

  const repositories =
    (data as RepoFile).repositories ?? (data as TomlRepoFile).repository ?? (data as TomlRepoFile).repositories;

  return Array.isArray(repositories) ? repositories : [];
};

const hasRepoPath = (repo: TomlRepo | null | undefined): repo is TomlRepo & { path: string } =>
  !!repo && typeof repo.path === "string" && repo.path.length > 0;

const normalizeRepos = (repositories: TomlRepo[]): Repo[] =>
  repositories.filter(hasRepoPath).map((repo, index) => {
    const lastAccessTime =
      typeof repo.lastAccessTime === "number" ? repo.lastAccessTime : typeof repo.opened === "number" ? repo.opened : 0;

    return {
      id: typeof repo.id === "number" ? repo.id : index,
      parentId: repo.parentId ?? null,
      name: repo.name ?? basename(repo.path),
      path: repo.path,
      lastAccessTime,
    };
  });

const useRepos = (repoFilePaths: string[]): [Repo[], boolean] => {
  const { data, isLoading } = useCachedPromise(
    async (paths) => {
      const resolvedPath = resolveRepoFilePath(paths);
      if (!resolvedPath) {
        return [];
      }
      try {
        const rawData = readFileSync(resolvedPath, "utf8");
        const repositories = normalizeRepos(parseRepoItems(rawData, resolvedPath));
        if (repositories.length === 0) {
          return [];
        }
        return repositories.filter((repo) => existsSync(repo.path)).sort((a, b) => a.name.localeCompare(b.name));
      } catch (error) {
        console.error(error);
        return [];
      }
    },
    [repoFilePaths],
    { initialData: [], keepPreviousData: true }
  );
  return [data, isLoading];
};

export { useRepos };
