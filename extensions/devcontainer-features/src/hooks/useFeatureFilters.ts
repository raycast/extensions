import { useMemo, useState } from "react";
import type { Feature } from "../types";
import { isOfficialFeature } from "../utils/collection";

export interface FeatureFilters {
  showFavoritesOnly: boolean;
  showOfficialOnly: boolean;
  hasOptions: boolean | null; // null = all, true = with options, false = without
  collection: string | null;
}

const DEFAULT_FILTERS: FeatureFilters = {
  showFavoritesOnly: false,
  showOfficialOnly: false,
  hasOptions: null,
  collection: null,
};

interface UseFeatureFiltersResult {
  filters: FeatureFilters;
  setFilters: (filters: FeatureFilters) => void;
  updateFilter: <K extends keyof FeatureFilters>(
    key: K,
    value: FeatureFilters[K],
  ) => void;
  resetFilters: () => void;
  filteredFeatures: Feature[];
  filterFeatures: (features: Feature[], favorites?: string[]) => Feature[];
  hasActiveFilters: boolean;
}

export function useFeatureFilters(
  features: Feature[],
  favorites: string[] = [],
): UseFeatureFiltersResult {
  const [filters, setFilters] = useState<FeatureFilters>(DEFAULT_FILTERS);

  const updateFilter = <K extends keyof FeatureFilters>(
    key: K,
    value: FeatureFilters[K],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const filterFeatures = useMemo(() => {
    return (featureList: Feature[], favs: string[] = []) => {
      return featureList.filter((feature) => {
        // Filter by favorites
        if (filters.showFavoritesOnly && !favs.includes(feature.reference)) {
          return false;
        }

        // Filter by official
        if (filters.showOfficialOnly && !isOfficialFeature(feature)) {
          return false;
        }

        // Filter by has options
        if (filters.hasOptions !== null) {
          const hasOpts =
            feature.options && Object.keys(feature.options).length > 0;
          if (filters.hasOptions !== hasOpts) {
            return false;
          }
        }

        // Filter by collection
        if (
          filters.collection &&
          !feature.collection.ociReference.includes(filters.collection)
        ) {
          return false;
        }

        return true;
      });
    };
  }, [filters]);

  const filteredFeatures = useMemo(() => {
    return filterFeatures(features, favorites);
  }, [features, favorites, filterFeatures]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.showFavoritesOnly ||
      filters.showOfficialOnly ||
      filters.hasOptions !== null ||
      filters.collection !== null
    );
  }, [filters]);

  return {
    filters,
    setFilters,
    updateFilter,
    resetFilters,
    filteredFeatures,
    filterFeatures,
    hasActiveFilters,
  };
}

/**
 * Get unique collection names from features
 */
export function getUniqueCollections(features: Feature[]): string[] {
  const collections = new Set<string>();
  for (const feature of features) {
    const name = feature.collection.ociReference.replace("ghcr.io/", "");
    collections.add(name);
  }
  return Array.from(collections).sort();
}
