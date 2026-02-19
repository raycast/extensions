import { useCachedPromise } from "@raycast/utils";
import { getProjects, getProjectData } from "../api";
import { Task } from "../types";

async function fetchAllTasks(): Promise<Task[]> {
  const projects = await getProjects();
  const tasks: Task[] = [];
  const BATCH_SIZE = 5;
  for (let i = 0; i < projects.length; i += BATCH_SIZE) {
    const batch = projects.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map((p) => getProjectData(p.id)));
    tasks.push(...results.flatMap((r) => r.tasks ?? []));
  }
  return tasks;
}

async function fetchProjectTasks(projectId: string): Promise<Task[]> {
  const data = await getProjectData(projectId);
  return data.tasks ?? [];
}

export function useAllTasks() {
  const { data, isLoading, revalidate, error } = useCachedPromise(
    fetchAllTasks,
    [],
    {
      keepPreviousData: true,
    },
  );

  return {
    tasks: data ?? [],
    isLoading,
    revalidate,
    error,
  };
}

export function useProjectTasks(projectId: string | undefined) {
  const { data, isLoading, revalidate, error } = useCachedPromise(
    fetchProjectTasks,
    [projectId ?? ""],
    {
      execute: !!projectId,
      keepPreviousData: true,
    },
  );

  return {
    tasks: data ?? [],
    isLoading,
    revalidate,
    error,
  };
}
