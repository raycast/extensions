import { useCachedPromise, useFrecencySorting } from "@raycast/utils";
import { Cache } from "@raycast/api";
import { validateActivities, getActivities } from "../libs/api";

const CACHE_KEY = "activities";
const cache = new Cache();

const readFromCache = () => {
  const cachedString = cache.get(CACHE_KEY);
  if (!cachedString) return [];

  try {
    const cachedData = JSON.parse(cachedString);
    return validateActivities(cachedData);
  } catch {
    return [];
  }
};

export const useActivities = () => {
  const cachedActivities = readFromCache();
  const { isLoading, data } = useCachedPromise(
    async () => {
      const activities = await getActivities();
      cache.set(CACHE_KEY, JSON.stringify(activities));
      return activities;
    },
    [],
    {
      initialData: cachedActivities,
    },
  );
  const cleanData = validateActivities(data).map((d) => ({ ...d, id: String(d.id) }));
  const { data: sortedData, visitItem } = useFrecencySorting(cleanData);

  return { isLoading, activities: sortedData, visitItem };
};
