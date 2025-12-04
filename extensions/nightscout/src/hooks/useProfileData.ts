import { ProfileResponse, AppError, ActiveProfile, ProfileTargets, Treatment } from "../types";
import { getProfileConfig, profileService } from "../services";
import { useEffect, useState, useMemo } from "react";

export interface UseProfileDataResult {
  profiles: ProfileResponse[] | null;
  isLoading: boolean;
  appError: AppError | null;
  refresh: () => void;
}

export function useProfileData(): UseProfileDataResult {
  const [profiles, setProfiles] = useState<ProfileResponse[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [appError, setAppError] = useState<AppError | null>(null);

  const refresh = async () => {
    setIsLoading(true);
    setAppError(null);

    const { config, error: configError } = getProfileConfig();

    if (configError) {
      setAppError(configError);
      setIsLoading(false);
      return;
    }

    if (!config) {
      setAppError({
        type: "preferences-validation",
        message: "Invalid configuration",
        instanceUrl: "",
      });
      setIsLoading(false);
      return;
    }

    const result = await profileService.getProfiles(config);

    if (result.error) {
      setAppError(result.error);
    } else if (result.profiles) {
      setProfiles(result.profiles);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  return {
    profiles,
    isLoading,
    appError,
    refresh,
  };
}

/**
 * Hook to get active profile for a specific timestamp
 */
export function useActiveProfile(
  timestamp: number,
  treatments: Treatment[] = [],
): {
  activeProfile: ActiveProfile | null;
  isLoading: boolean;
  error: AppError | null;
} {
  const [activeProfile, setActiveProfile] = useState<ActiveProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);

  // create a stable key for treatments to avoid unnecessary re-renders
  const treatmentsKey = useMemo(() => {
    return treatments.map((t) => `${t._id || t.created_at}-${t.eventType}`).join(",");
  }, [treatments]);

  useEffect(() => {
    const fetchActiveProfile = async () => {
      setIsLoading(true);
      setError(null);

      const { config, error: configError } = getProfileConfig();

      if (configError || !config) {
        setError(
          configError || {
            type: "preferences-validation",
            message: "Invalid configuration",
            instanceUrl: "",
          },
        );
        setIsLoading(false);
        return;
      }

      const result = await profileService.getActiveProfile(config, timestamp, treatments);

      if (result.error) {
        setError(result.error);
      } else if (result.activeProfile) {
        setActiveProfile(result.activeProfile);
      }

      setIsLoading(false);
    };

    fetchActiveProfile();
  }, [timestamp, treatmentsKey]);

  return {
    activeProfile,
    isLoading,
    error,
  };
}

/**
 * Hook to get target values for a specific timestamp
 */
export function useProfileTargets(
  timestamp: number,
  treatments: Treatment[] = [],
): {
  targets: ProfileTargets | null;
  isLoading: boolean;
  error: AppError | null;
} {
  const [targets, setTargets] = useState<ProfileTargets | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);

  // create a stable key for treatments to avoid unnecessary re-renders
  const treatmentsKey = useMemo(() => {
    return treatments.map((t) => `${t._id || t.created_at}-${t.eventType}`).join(",");
  }, [treatments]);

  useEffect(() => {
    const fetchTargets = async () => {
      setIsLoading(true);
      setError(null);

      const { config, error: configError } = getProfileConfig();

      if (configError || !config) {
        setError(
          configError || {
            type: "preferences-validation",
            message: "Invalid configuration",
            instanceUrl: "",
          },
        );
        setIsLoading(false);
        return;
      }

      const result = await profileService.getTargetsAtTimestamp(config, timestamp, treatments);

      if (result.error) {
        setError(result.error);
      } else if (result.targets) {
        setTargets(result.targets);
      }

      setIsLoading(false);
    };

    fetchTargets();
  }, [timestamp, treatmentsKey]);

  return {
    targets,
    isLoading,
    error,
  };
}

/**
 * hook to get current profile targets
 */
export function useCurrentProfileTargets(treatments: Treatment[] = []): {
  targets: ProfileTargets | null;
  isLoading: boolean;
  error: AppError | null;
} {
  return useProfileTargets(Date.now(), treatments);
}
