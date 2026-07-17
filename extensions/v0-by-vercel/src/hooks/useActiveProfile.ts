import { useState, useEffect, useCallback } from "react";
import { useCachedState } from "@raycast/utils"; // Import useCachedState
import { getActiveProfileDetails } from "../lib/profile-utils";
import type { Profile } from "../types"; // Import Profile type

interface ActiveProfileHookResult {
  activeProfileApiKey: string | undefined;
  activeProfileDefaultScope: string | null;
  isLoadingProfileDetails: boolean;
  revalidateActiveProfile: () => void;
}

export function useActiveProfile(): ActiveProfileHookResult {
  const [profiles] = useCachedState<Profile[]>("v0-profiles", []);
  const [activeProfileId] = useCachedState<string | undefined>("v0-active-profile-id", undefined);
  const [activeProfileApiKey, setActiveProfileApiKey] = useState<string | undefined>(undefined);
  const [activeProfileDefaultScope, setActiveProfileDefaultScope] = useState<string | null>(null);
  const [isLoadingProfileDetails, setIsLoadingProfileDetails] = useState(true);

  const fetchProfileDetails = useCallback(async () => {
    setIsLoadingProfileDetails(true);
    const { apiKey, defaultScope } = await getActiveProfileDetails(profiles, activeProfileId);
    setActiveProfileApiKey(apiKey);
    setActiveProfileDefaultScope(defaultScope);
    setIsLoadingProfileDetails(false);
  }, [activeProfileId, profiles]);

  useEffect(() => {
    fetchProfileDetails();
  }, [fetchProfileDetails]);

  return {
    activeProfileApiKey,
    activeProfileDefaultScope,
    isLoadingProfileDetails,
    revalidateActiveProfile: fetchProfileDetails,
  };
}
