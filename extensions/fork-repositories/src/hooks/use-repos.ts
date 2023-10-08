import { existsSync, readFileSync } from "node:fs";
import { useCachedPromise } from "@raycast/utils";

const useRepos = (repoFilePath: string): [Repo[], boolean] => {
  const { data, isLoading } = useCachedPromise(
    async (path) => {
      if (!existsSync(path)) {
        return [];
      }
      try {
        const repoFile: RepoFile = JSON.parse(readFileSync(path).toString());
        if (!Array.isArray(repoFile?.repositories)) {
          return [];
        }
        return repoFile.repositories
          .filter((repo) => existsSync(repo.path))
          .sort((a, b) => a.name.localeCompare(b.name));
      } catch (error) {
        console.error(error);
        return [];
      }
    },
    [repoFilePath],
    { initialData: [], keepPreviousData: true }
  );
  return [data, isLoading];
};

export { useRepos };
