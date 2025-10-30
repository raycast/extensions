import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { Category, KiteResponse } from "../interfaces";
import { CATEGORIES_URL } from "../utils";

export function useCategories() {
  const {
    isLoading,
    data: categoriesData,
    error,
  } = useFetch<KiteResponse>(CATEGORIES_URL, {
    parseResponse: async (response): Promise<KiteResponse> => {
      if (!response.ok) {
        throw new Error("Failed to load categories");
      }
      return (await response.json()) as KiteResponse;
    },
  });

  const categories = useMemo(() => (categoriesData?.categories || []) as Category[], [categoriesData]);

  return {
    categories,
    isLoading,
    error,
  };
}
