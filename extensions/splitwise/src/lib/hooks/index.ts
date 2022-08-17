import { splitwise } from "../splitwise";
import { useCachedPromise } from "@raycast/utils";
import { Category } from "splitwise";

export const useGroups = () => useCachedPromise(() => splitwise.getGroups(), []);
export const useGroup = (groupId?: number) =>
  useCachedPromise((groupId) => splitwise.getGroup({ id: groupId }), [groupId], {
    execute: !!groupId,
  });

export const useExpenses = (groupId?: number) =>
  useCachedPromise((groupId) => splitwise.getExpenses({ group_id: groupId }), [groupId]);

export const useCategories = () =>
  useCachedPromise(
    () => {
      return splitwise.getCategories();
    },
    [],
    {
      keepPreviousData: true,
    }
  );

export const useCategoryMap = () => {
  const { data } = useCategories();

  if (!data) {
    return {};
  }

  const rootCategories = data;
  const subCategories = data.flatMap((category) => category.subcategories);

  return (
    ([...rootCategories, ...subCategories].reduce(
      (acc, category) => ({
        ...acc,
        [category.id]: category,
      }),
      {}
    ) as Record<number, Category>) || {}
  );
};

export type CategoryMap = ReturnType<typeof useCategoryMap>;
