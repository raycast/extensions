import { useEffect, useState } from "react";
import { existsSync, readFileSync } from "fs";

const useRepos = (repoFilePath: string): Repo[] => {
  const [repos, setRepos] = useState<Repo[]>([]);
  useEffect(() => {
    if (!existsSync(repoFilePath)) {
      return;
    }
    const repoFile: RepoFile = JSON.parse(readFileSync(repoFilePath).toString());
    if (!Array.isArray(repoFile?.repositories)) {
      return;
    }
    setRepos(
      repoFile.repositories.filter((repo) => existsSync(repo.path)).sort((a, b) => a.name.localeCompare(b.name))
    );
  }, [repoFilePath]);
  return repos;
};

export { useRepos };
