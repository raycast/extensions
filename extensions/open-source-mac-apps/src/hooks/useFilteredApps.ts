import { useMemo } from "react";
import { MacApp } from "../types";

interface UseFilteredAppsParams {
  apps: MacApp[] | undefined;
  searchText: string;
  categoryFilter: string | null;
}

/**
 * Custom hook to filter apps based on search text and category
 */
export function useFilteredApps({ apps, searchText, categoryFilter }: UseFilteredAppsParams) {
  return useMemo(() => {
    if (!apps) return [];

    return apps.filter((app) => {
      const matchesSearch =
        searchText === "" ||
        app.name.toLowerCase().includes(searchText.toLowerCase()) ||
        app.description.toLowerCase().includes(searchText.toLowerCase()) ||
        app.categories.some((category) => category.toLowerCase().includes(searchText.toLowerCase()));

      const matchesCategory = !categoryFilter || app.categories.includes(categoryFilter);

      return matchesSearch && matchesCategory;
    });
  }, [apps, searchText, categoryFilter]);
}