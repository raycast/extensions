/**
 * Custom hook for profile list state management
 * Follows Single Responsibility Principle by separating state logic from UI
 */

import { useState, useEffect, useCallback } from "react";
import { ProfileSummary } from "../types/profile-types";
import { useProfileManager } from "../context/ServiceProvider";

export interface ProfileListState {
  profiles: ProfileSummary[];
  activeProfileId: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface ProfileListActions {
  loadProfiles: () => Promise<void>;
  refreshProfiles: () => Promise<void>;
  clearError: () => void;
}

export interface UseProfileListResult extends ProfileListState, ProfileListActions {}

/**
 * Hook for managing profile list state and operations
 */
export function useProfileList(): UseProfileListResult {
  const profileManager = useProfileManager();

  const [state, setState] = useState<ProfileListState>({
    profiles: [],
    activeProfileId: null,
    isLoading: true,
    error: null,
  });

  const loadProfiles = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Load profiles and active profile in parallel
      const [profilesResult, activeProfileResult] = await Promise.all([
        profileManager.getProfileSummaries(),
        profileManager.getActiveProfile(),
      ]);

      if (!profilesResult.success) {
        throw new Error(profilesResult.error || "Failed to load profiles");
      }

      if (!activeProfileResult.success) {
        throw new Error(activeProfileResult.error || "Failed to get active profile");
      }

      // Update profiles with active status
      const profiles = (profilesResult.data || []).map((profile) => ({
        ...profile,
        isActive: profile.id === activeProfileResult.data,
      }));

      setState({
        profiles,
        activeProfileId: activeProfileResult.data ?? null,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load profiles";
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [profileManager]);

  const refreshProfiles = useCallback(async () => {
    await loadProfiles();
  }, [loadProfiles]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Load profiles on mount
  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  return {
    ...state,
    loadProfiles,
    refreshProfiles,
    clearError,
  };
}

/**
 * Hook for profile filtering and search functionality
 */
export function useProfileFilter(profiles: ProfileSummary[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredProfiles, setFilteredProfiles] = useState<ProfileSummary[]>(profiles);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProfiles(profiles);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = profiles.filter(
      (profile) => profile.name.toLowerCase().includes(query) || profile.description?.toLowerCase().includes(query),
    );

    setFilteredProfiles(filtered);
  }, [profiles, searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    filteredProfiles,
  };
}

/**
 * Hook for profile sorting functionality
 */
export function useProfileSort(profiles: ProfileSummary[]) {
  const [sortBy, setSortBy] = useState<"name" | "created" | "lastUsed" | "serverCount">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [sortedProfiles, setSortedProfiles] = useState<ProfileSummary[]>(profiles);

  useEffect(() => {
    const sorted = [...profiles].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "created":
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case "lastUsed": {
          const aLastUsed = a.lastUsed?.getTime() || 0;
          const bLastUsed = b.lastUsed?.getTime() || 0;
          comparison = aLastUsed - bLastUsed;
          break;
        }
        case "serverCount":
          comparison = a.serverCount - b.serverCount;
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    setSortedProfiles(sorted);
  }, [profiles, sortBy, sortOrder]);

  const toggleSort = useCallback(
    (field: typeof sortBy) => {
      if (sortBy === field) {
        setSortOrder((order) => (order === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(field);
        setSortOrder("asc");
      }
    },
    [sortBy],
  );

  return {
    sortBy,
    sortOrder,
    sortedProfiles,
    toggleSort,
    setSortBy,
    setSortOrder,
  };
}
