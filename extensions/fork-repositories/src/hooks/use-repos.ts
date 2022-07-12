import { useEffect, useRef, useState } from "react";
import { existsSync, readFileSync } from "fs";

const useRepos = (repoFilePath: string): [Repo[], boolean] => {
  const [state, setState] = useState<{ isLoading: boolean; repos: Repo[] }>({ isLoading: true, repos: [] });
  const isMounted = useRef(true);
  useEffect(() => {
    setState((previous) => ({ ...previous, isLoading: true }));

    if (!existsSync(repoFilePath)) {
      if (isMounted.current) {
        setState((previous) => ({ ...previous, isLoading: false }));
      }
      return;
    }
    const repoFile: RepoFile = JSON.parse(readFileSync(repoFilePath).toString());
    if (!Array.isArray(repoFile?.repositories)) {
      if (isMounted.current) {
        setState((previous) => ({ ...previous, isLoading: false }));
      }
      return;
    }
    if (isMounted.current) {
      setState({
        repos: repoFile.repositories
          .filter((repo) => existsSync(repo.path))
          .sort((a, b) => a.name.localeCompare(b.name)),
        isLoading: false,
      });
    }

    return function cleanup() {
      isMounted.current = false;
    };
  }, [repoFilePath]);

  return [state.repos, state.isLoading];
};

export { useRepos };
