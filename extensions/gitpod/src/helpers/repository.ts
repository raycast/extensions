import { LocalStorage } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";

import { ExtendedRepositoryFieldsFragment } from "../generated/graphql";

const VISITED_REPOSITORIES_KEY = "VISITED_REPOSITORIES";
const VISITED_REPOSITORIES_LENGTH = 25;

// History was stored in `LocalStorage` before, after migration it's stored in `Cache`
async function loadVisitedRepositories() {
  const item = await LocalStorage.getItem<string>(VISITED_REPOSITORIES_KEY);
  if (item) {
    const parsed = JSON.parse(item).slice(0, VISITED_REPOSITORIES_LENGTH);
    return parsed as ExtendedRepositoryFieldsFragment[];
  } else {
    return [];
  }
}

export function useHistory(searchText: string | undefined, searchFilter: string | null) {
  const [history, setHistory] = useCachedState<ExtendedRepositoryFieldsFragment[]>("history", []);
  const [migratedHistory, setMigratedHistory] = useCachedState<boolean>("migratedHistory", false);

  useEffect(() => {
    if (!migratedHistory) {
      loadVisitedRepositories().then((repositories) => {
        setHistory(repositories);
        setMigratedHistory(true);
      });
    }
  }, [migratedHistory]);

  function visitRepository(repository: ExtendedRepositoryFieldsFragment) {
    const visitedRepositories = [repository, ...(history?.filter((item) => item.id !== repository.id) ?? [])];
    LocalStorage.setItem(VISITED_REPOSITORIES_KEY, JSON.stringify(visitedRepositories));
    const nextRepositories = visitedRepositories.slice(0, VISITED_REPOSITORIES_LENGTH);
    setHistory(nextRepositories);
  }

  const repositoryFilter = `${searchFilter?.replaceAll(/org:|user:/g, "").replaceAll(" ", "|")}/.*`;

  const data = history
    .filter((r) => r.nameWithOwner.includes(searchText ?? ""))
    .filter((r) => r.nameWithOwner.match(repositoryFilter));

  return { data, visitRepository };
}
