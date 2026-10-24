import { useEffect, useRef, useState } from "react";
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

  useEffect(() => {
    loadVisitedRepositories().then((storedRepositories) => {
      repositoriesRef.current = storedRepositories;
      setRepositories(storedRepositories);
    });
  }, []);

  async function visitRepository(repository: Repository) {
    const nextRepositories = [repository, ...repositoriesRef.current.filter((item) => item.id !== repository.id)].slice(
      0,
      VISITED_REPOSITORIES_LENGTH,
    );

    repositoriesRef.current = nextRepositories;
    setRepositories(nextRepositories);
    await saveVisitedRepositories(nextRepositories);
  }

  async function removeVisitedRepository(repository: Repository) {
    const nextRepositories = repositoriesRef.current.filter((item) => item.id !== repository.id);

    repositoriesRef.current = nextRepositories;
    setRepositories(nextRepositories);
    await saveVisitedRepositories(nextRepositories);
  }

  async function clearVisitedRepositories() {
    repositoriesRef.current = [];
    setRepositories([]);
    await LocalStorage.removeItem(VISITED_REPOSITORIES_KEY);
  }

  return { repositories, visitRepository, removeVisitedRepository, clearVisitedRepositories, isLoading: !repositories };
}
