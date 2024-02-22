import { useCachedPromise, useFrecencySorting } from "@raycast/utils";
import { Cache } from "@raycast/api";
import { Activity, getActivities } from "../libs/api";

const CACHE_KEY = "activities";
const cache = new Cache();

export const useActivities = () => {
  const cached = cache.get(CACHE_KEY);
  const cachedActivities: Activity[] = cached ? JSON.parse(cached) : [];
  const { isLoading, data } = useCachedPromise(
    async () => {
      const activities = await getActivities();
      cache.set(CACHE_KEY, JSON.stringify(activities));
      return activities;
    },
    [],
    {
      keepPreviousData: true,
      initialData: cachedActivities,
    },
  );
  const cleanData = (data || []).map((d) => ({ ...d, id: String(d.id) }));
  const { data: sortedData, visitItem } = useFrecencySorting(cleanData);

  return { isLoading, activities: sortedData, visitItem };
};
