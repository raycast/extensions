import { LocalStorage } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect } from "react";
import { Repository } from "./types";

const VISITED_REPOSITORIES_KEY = "VISITED_REPOSITORIES";
const VISITED_REPOSITORIES_LENGTH = 25;

// History was stored in `LocalStorage` before, after migration it's stored in `Cache`
async function loadVisitedRepositories() {
  const item = await LocalStorage.getItem<string>(VISITED_REPOSITORIES_KEY);
  if (item) {
    const parsed = JSON.parse(item);
    return parsed as Repository[];
  } else {
    return [];
  }
}

export function useHistory() {
  const [history, setHistory] = useCachedState<Repository[]>("history", []);
  const [migratedHistory, setMigratedHistory] = useCachedState<boolean>("migratedHistory", false);

  useEffect(() => {
    if (!migratedHistory) {
      loadVisitedRepositories().then((repositories) => {
        setHistory(repositories);
        setMigratedHistory(true);
      });
    }
  }, [migratedHistory]);

  function visitRepository(repository: Repository) {
    const nextRepositories = [repository, ...(history?.filter((item) => item !== repository) ?? [])].slice(
      0,
      VISITED_REPOSITORIES_LENGTH
    );
    setHistory(nextRepositories);
  }

  return { data: history, visitRepository };
}
