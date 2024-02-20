import { useCachedPromise, useFrecencySorting } from "@raycast/utils";
import { Project, getProjects } from "../libs/api";
import { Cache } from "@raycast/api";

const CACHE_KEY = "projects";
const cache = new Cache();

export const useProjects = () => {
  const cached = cache.get(CACHE_KEY);
  const cachedProjects: Project[] = cached ? JSON.parse(cached) : [];
  const { isLoading, data } = useCachedPromise(
    async () => {
      const projects = await getProjects();
      cache.set(CACHE_KEY, JSON.stringify(projects));
      return projects;
    },
    [],
    {
      keepPreviousData: true,
      initialData: cachedProjects,
    },
  );
  const cleanData = (data || []).map((d) => ({ ...d, id: String(d.id) }));
  const { data: sortedData, visitItem } = useFrecencySorting(cleanData);

  return { isLoading, projects: sortedData, visitItem };
};
