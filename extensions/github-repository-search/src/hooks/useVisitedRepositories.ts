import { useCallback, useEffect, useRef, useState } from "react";
import { LocalStorage } from "@raycast/api";
import type { Repository } from "@/types";

const VISITED_REPOSITORIES_KEY = "VISITED_REPOSITORIES";
const VISITED_REPOSITORIES_LENGTH = 25;

async function loadVisitedRepositories() {
  const item = await LocalStorage.getItem<string>(VISITED_REPOSITORIES_KEY);
  if (item) {
    const parsed = JSON.parse(item);
    return parsed as Repository[];
  } else {
    return [];
  }
}

async function saveVisitedRepositories(repositories: Repository[]) {
  const data = JSON.stringify(repositories);
  await LocalStorage.setItem(VISITED_REPOSITORIES_KEY, data);
}

export function useVisitedRepositories() {
  const [repositories, setRepositories] = useState<Repository[]>();
  const repositoriesRef = useRef<Repository[]>([]);
  const operationQueue = useRef<Promise<void>>(Promise.resolve());

  const enqueueOperation = useCallback((operation: () => Promise<void>) => {
    const queuedOperation = operationQueue.current.then(operation, operation);
    operationQueue.current = queuedOperation.catch(() => undefined);
    return queuedOperation;
  }, []);

  useEffect(() => {
    loadVisitedRepositories().then((storedRepositories) => {
      repositoriesRef.current = storedRepositories;
      setRepositories(storedRepositories);
    });
  }, []);

  function visitRepository(repository: Repository) {
    return enqueueOperation(async () => {
      const nextRepositories = [
        repository,
        ...repositoriesRef.current.filter((item) => item.id !== repository.id),
      ].slice(0, VISITED_REPOSITORIES_LENGTH);

      await saveVisitedRepositories(nextRepositories);
      repositoriesRef.current = nextRepositories;
      setRepositories(nextRepositories);
    });
  }

  function removeVisitedRepository(repository: Repository) {
    return enqueueOperation(async () => {
      const nextRepositories = repositoriesRef.current.filter((item) => item.id !== repository.id);

      await saveVisitedRepositories(nextRepositories);
      repositoriesRef.current = nextRepositories;
      setRepositories(nextRepositories);
    });
  }

  function clearVisitedRepositories() {
    return enqueueOperation(async () => {
      await LocalStorage.removeItem(VISITED_REPOSITORIES_KEY);
      repositoriesRef.current = [];
      setRepositories([]);
    });
  }

  const refreshVisitedRepositories = useCallback(
    (searchResults: Repository[]) =>
      enqueueOperation(async () => {
        const searchResultsById = new Map(searchResults.map((repository) => [repository.id, repository]));
        const nextRepositories = repositoriesRef.current.map(
          (repository) => searchResultsById.get(repository.id) ?? repository,
        );

        if (nextRepositories.every((repository, index) => repository === repositoriesRef.current[index])) {
          return;
        }

        await saveVisitedRepositories(nextRepositories);
        repositoriesRef.current = nextRepositories;
        setRepositories(nextRepositories);
      }),
    [enqueueOperation],
  );

  return {
    repositories,
    visitRepository,
    removeVisitedRepository,
    clearVisitedRepositories,
    refreshVisitedRepositories,
    isLoading: !repositories,
  };
}
