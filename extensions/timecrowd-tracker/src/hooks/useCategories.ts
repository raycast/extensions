import { useCachedPromise } from "@raycast/utils";
import { getCategories, type Category } from "@/api";

export const useCategories = () => {
  const { data, isLoading } = useCachedPromise(getCategories);
  const categoriesGroupByTeam = data?.reduce(
    (acc, current) => {
      const teamName = current.team.name;
      acc[teamName] ? acc[teamName].push(current) : (acc[teamName] = [current]);

      return acc;
    },
    {} as Record<string, Category[]>,
  );

  return { categories: data, categoriesGroupByTeam, isLoadingCategories: isLoading };
};
