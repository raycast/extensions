import { useV0Api } from "./useV0Api";
import { getActiveProfileDetails } from "../lib/profile-utils";
import type { FindProjectsResponse } from "../types";
import { useState, useEffect } from "react";
import { useCachedState } from "@raycast/utils";
import type { Profile } from "../types";

interface ProjectSummary {
  id: string;
  object: "project";
  name: string;
  vercelProjectId?: string;
}

interface UseProjectsResult {
  projects: ProjectSummary[];
  isLoadingProjects: boolean;
  projectError: Error | undefined;
  revalidateProjects: () => void;
}

export function useProjects(scope: string | null = null): UseProjectsResult {
  const [activeProfileApiKey, setActiveProfileApiKey] = useState<string | undefined>(undefined);
  const [activeProfileDefaultScope, setActiveProfileDefaultScope] = useState<string | null>(null);
  const [isLoadingProfileDetails, setIsLoadingProfileDetails] = useState(true);
  const [profiles] = useCachedState<Profile[]>("v0-profiles", []); // Get profiles
  const [activeProfileId] = useCachedState<string | undefined>("v0-active-profile-id", undefined); // Get active profile ID

  useEffect(() => {
    async function fetchProfileDetails() {
      const { apiKey, defaultScope } = getActiveProfileDetails(profiles, activeProfileId); // Pass profiles and activeProfileId
      setActiveProfileApiKey(apiKey);
      setActiveProfileDefaultScope(defaultScope);
      setIsLoadingProfileDetails(false);
    }
    fetchProfileDetails();
  }, [profiles, activeProfileId]);

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (activeProfileApiKey) {
    headers.Authorization = `Bearer ${activeProfileApiKey}`;
  }

  const activeScope = scope || activeProfileDefaultScope;

  if (activeScope) {
    headers["X-Scope"] = activeScope;
  }

  const { isLoading, data, error, revalidate } = useV0Api<FindProjectsResponse>(
    activeProfileApiKey && !isLoadingProfileDetails ? "https://api.v0.dev/v1/projects" : "",
    {
      headers,
      execute: !!activeProfileApiKey && !isLoadingProfileDetails, // Only execute if apiKey and profile details are available
    },
  );

  return {
    projects: data?.data || [],
    isLoadingProjects: isLoading || isLoadingProfileDetails,
    projectError: error,
    revalidateProjects: revalidate,
  };
}
