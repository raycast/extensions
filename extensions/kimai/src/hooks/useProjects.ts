import { useCachedPromise, useFrecencySorting } from "@raycast/utils";
import { validateProjects, getProjects } from "../libs/api";
import { Cache } from "@raycast/api";

const CACHE_KEY = "projects";
const cache = new Cache();

const readFromCache = () => {
  const cachedString = cache.get(CACHE_KEY);
  if (!cachedString) return [];

  try {
    const cachedData = JSON.parse(cachedString);
    return validateProjects(cachedData);
  } catch {
    return [];
  }
};

export const useProjects = () => {
  const cachedProjects = readFromCache();
  const { isLoading, data } = useCachedPromise(
    async () => {
      const projects = await getProjects();
      cache.set(CACHE_KEY, JSON.stringify(projects));
      return projects;
    },
    [],
    {
      initialData: cachedProjects,
    },
  );
  const cleanData = validateProjects(data).map((d) => ({ ...d, id: String(d.id) }));
  const { data: sortedData, visitItem } = useFrecencySorting(cleanData);

  return { isLoading, projects: sortedData, visitItem };
};
