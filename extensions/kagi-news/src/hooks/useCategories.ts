// Hook to fetch news categories from the latest batch (used for the daily news command)

import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { Category } from "../interfaces";

export function useCategories() {
  const {
    isLoading,
    data: categoriesData,
    error,
  } = useFetch<Category[]>("https://kite.kagi.com/api/batches/latest/categories?lang=default", {
    parseResponse: async (response): Promise<Category[]> => {
      if (!response.ok) {
        throw new Error("Failed to load categories");
      }
      const json = (await response.json()) as {
        categories: { categoryName: string; id: string }[];
        hasOnThisDay?: boolean;
      };

      const categories: Category[] = json.categories.map((cat) => ({
        name: cat.categoryName,
        id: cat.id,
      }));

      if (json.hasOnThisDay) {
        categories.push({
          name: "Today in History",
          id: "onthisday",
        });
      }

      return categories;
    },
  });

  const categories = useMemo(() => categoriesData || [], [categoriesData]);

  return {
    categories,
    isLoading,
    error,
  };
}
