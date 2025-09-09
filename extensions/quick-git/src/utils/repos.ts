export interface RepoDir {
  id: string;
  label: string;
}

export function parseRepoDirectoryName(repoList: string, base: string): RepoDir[] {
  if (!repoList) return [];

  return repoList.split("\n").reduce<RepoDir[]>((currList, value) => {
    if (!value || value.endsWith("Operation not permitted")) {
      return currList;
    }

    const repoDir = { id: value, label: value.replace(base + "/", "") };

    currList.push(repoDir);
    return currList;
  }, []);
}
