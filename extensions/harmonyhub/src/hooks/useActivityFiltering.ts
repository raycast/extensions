/**
 * Hook for filtering activities with memoization.
 * Provides filtered activities, grouping, and search functionality.
 * @module
 */

import { useMemo } from "react";

import { useViewStore } from "../stores/view";
import { HarmonyActivity } from "../types/core/harmony";

import { useHarmony } from "./useHarmony";

/**
 * Result interface for activity filtering operations.
 * Contains filtered activities and related metadata.
 * @interface ActivityFilteringResult
 */
interface ActivityFilteringResult {
  /** List of activities after applying filters */
  filteredActivities: HarmonyActivity[];
  /** List of unique activity types */
  activityTypes: string[];
  /** Map of activities grouped by type */
  activitiesByType: Map<string, HarmonyActivity[]>;
  /** Map of activity status (running/stopped) */
  activityStatus: Map<string, boolean>;
  /** Total number of activities before filtering */
  totalActivities: number;
  /** Number of activities after filtering */
  filteredCount: number;
  /** Currently running activity */
  currentActivity: HarmonyActivity | null;
}

/**
 * Hook for filtering and searching activities.
 * Provides memoized filtering, grouping, and status tracking.
 * Integrates with view store for search and filter state.
 * @returns ActivityFilteringResult containing filtered activities and metadata
 */
export function useActivityFiltering(): ActivityFilteringResult {
  const { activities, currentActivity } = useHarmony();
  const searchQuery = useViewStore((state) => state.searchQuery);
  const filters = useViewStore((state) => state.filters);

  // Memoize filtered activities
  const filteredActivities = useMemo(() => {
    let result = [...activities];

    // Apply activity type filter
    if (filters.activityType) {
      result = result.filter((activity) => activity.type === filters.activityType);
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (activity) => activity.name.toLowerCase().includes(query) || activity.type.toLowerCase().includes(query),
      );
    }

    return result;
  }, [activities, searchQuery, filters.activityType]);

  // Memoize activity types
  const activityTypes = useMemo(() => {
    const types = new Set(activities.map((activity) => activity.type));
    return Array.from(types).sort();
  }, [activities]);

  // Memoize activities by type
  const activitiesByType = useMemo(() => {
    const byType = new Map<string, HarmonyActivity[]>();

    filteredActivities.forEach((activity) => {
      const activities = byType.get(activity.type) || [];
      activities.push(activity);
      byType.set(activity.type, activities);
    });

    // Sort activities within each type
    byType.forEach((activities) => {
      activities.sort((a, b) => {
        // Put current activity first
        if (a.id === currentActivity?.id) return -1;
        if (b.id === currentActivity?.id) return 1;
        // Then sort by name
        return a.name.localeCompare(b.name);
      });
    });

    return byType;
  }, [filteredActivities, currentActivity]);

  // Memoize activity status
  const activityStatus = useMemo(() => {
    const status = new Map<string, boolean>();

    activities.forEach((activity) => {
      status.set(activity.id, activity.isCurrent);
    });

    return status;
  }, [activities]);

  return {
    filteredActivities,
    activityTypes,
    activitiesByType,
    activityStatus,
    totalActivities: activities.length,
    filteredCount: filteredActivities.length,
    currentActivity,
  };
}
