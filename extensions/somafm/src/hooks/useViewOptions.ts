import { useState, useEffect } from "react";
import { LocalStorage } from "@raycast/api";

export type SortBy = "name" | "listeners";
export type SortDirection = "asc" | "desc";
export type GroupBy = "none" | "genre";

interface ViewOptions {
  sortBy: SortBy;
  sortDirection: SortDirection;
  groupBy: GroupBy;
}

const VIEW_OPTIONS_KEY = "somafm-view-options";

const defaultOptions: ViewOptions = {
  sortBy: "name",
  sortDirection: "asc",
  groupBy: "none",
};

export function useViewOptions() {
  const [viewOptions, setViewOptions] = useState<ViewOptions>(defaultOptions);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadViewOptions();
  }, []);

  async function loadViewOptions() {
    try {
      const stored = await LocalStorage.getItem<string>(VIEW_OPTIONS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Handle backward compatibility
        if ("sortOrder" in parsed) {
          parsed.sortBy = parsed.sortOrder === "listeners" ? "listeners" : "name";
          parsed.sortDirection = parsed.sortOrder === "listeners" ? "desc" : "asc";
          delete parsed.sortOrder;
        }
        setViewOptions({ ...defaultOptions, ...parsed });
      }
    } catch (error) {
      console.error("Failed to load view options:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function updateViewOptions(updates: Partial<ViewOptions>) {
    const newOptions = { ...viewOptions, ...updates };
    setViewOptions(newOptions);
    try {
      await LocalStorage.setItem(VIEW_OPTIONS_KEY, JSON.stringify(newOptions));
    } catch (error) {
      console.error("Failed to save view options:", error);
    }
  }

  function setSortBy(sortBy: SortBy) {
    if (viewOptions.sortBy === sortBy) {
      // If clicking the same sort, toggle direction
      const newDirection = viewOptions.sortDirection === "asc" ? "desc" : "asc";
      updateViewOptions({ sortDirection: newDirection });
    } else {
      // If clicking a different sort, set it with default direction
      updateViewOptions({
        sortBy,
        sortDirection: sortBy === "name" ? "asc" : "desc",
      });
    }
  }

  function toggleGroupBy() {
    const newGroupBy = viewOptions.groupBy === "none" ? "genre" : "none";
    updateViewOptions({ groupBy: newGroupBy });
  }

  return {
    viewOptions,
    isLoading,
    setSortBy,
    toggleGroupBy,
    updateViewOptions,
  };
}
