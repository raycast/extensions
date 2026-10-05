import { Cache, getPreferenceValues } from "@raycast/api";
import { ProfileResponse, AppError, Treatment, ActiveProfile, ProfileTargets, getTargetsAtTime } from "../types";
import { createNetworkError, createDataValidationError, createPreferencesError } from "../utils/errorHandling";
import { PROFILE_CACHE_KEY } from "../constants";

interface ProfileServiceConfig {
  instance: string;
  token?: string;
}

interface CachedProfile {
  data: ProfileResponse[];
  lastFetched: number;
}

/**
 * Validator for profile response data
 */
class ProfileValidator {
  isValid(profile: unknown): profile is ProfileResponse {
    if (typeof profile !== "object" || profile === null) {
      return false;
    }

    const obj = profile as Record<string, unknown>;
    return (
      typeof obj._id === "string" &&
      typeof obj.defaultProfile === "string" &&
      typeof obj.store === "object" &&
      obj.store !== null &&
      typeof obj.units === "string"
    );
  }

  validateArray(data: unknown): data is ProfileResponse[] {
    if (!Array.isArray(data)) {
      return false;
    }
    return data.every((profile) => this.isValid(profile));
  }
}

/**
 * Service to fetch and cache server profiles from Nightscout API
 */
class ProfileService {
  private cache = new Cache();
  private readonly CACHE_DURATION = 1 * 60 * 1000;
  private validator = new ProfileValidator();

  private validateUrlProtocol(urlString: string): boolean {
    try {
      const url = new URL(urlString);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  private buildUrl(config: ProfileServiceConfig): string {
    const url = new URL(`/api/v1/profile.json`, config.instance);

    if (config.token && config.token.trim() !== "" && config.token.trim() !== " ") {
      url.searchParams.append("token", config.token.trim());
    }

    return url.toString();
  }

  private getCachedData(): CachedProfile | null {
    try {
      const cached = this.cache.get(PROFILE_CACHE_KEY);
      if (!cached) return null;

      const parsedCache = JSON.parse(cached) as CachedProfile;
      const now = Date.now();

      // check if cache is still fresh
      if (now - parsedCache.lastFetched > this.CACHE_DURATION) {
        return null;
      }

      return parsedCache;
    } catch {
      return null;
    }
  }

  private setCachedData(data: ProfileResponse[]): void {
    try {
      const cachedData: CachedProfile = {
        data,
        lastFetched: Date.now(),
      };
      this.cache.set(PROFILE_CACHE_KEY, JSON.stringify(cachedData));
    } catch {
      // Silently fail cache operations
    }
  }

  private async fetchFromApi(config: ProfileServiceConfig): Promise<{
    data?: ProfileResponse[];
    error?: AppError;
  }> {
    try {
      const url = this.buildUrl(config);

      if (!this.validateUrlProtocol(url)) {
        return {
          error: createNetworkError(new Error("Invalid URL protocol"), config.instance),
        };
      }

      const response = await fetch(url);

      if (!response.ok) {
        return {
          error: createNetworkError(new Error(`HTTP ${response.status}: ${response.statusText}`), config.instance),
        };
      }

      const data = await response.json();

      if (!this.validator.validateArray(data)) {
        return {
          error: createDataValidationError(config.instance),
        };
      }

      return { data };
    } catch (error) {
      return {
        error: createNetworkError(error instanceof Error ? error : new Error("Unknown network error"), config.instance),
      };
    }
  }

  /**
   * Get server profiles, using cache if fresh or fetching from API if stale
   */
  async getProfiles(
    config: ProfileServiceConfig,
    forceRefresh = false,
  ): Promise<{
    profiles?: ProfileResponse[];
    fromCache: boolean;
    error?: AppError;
  }> {
    if (!forceRefresh) {
      const cached = this.getCachedData();
      if (cached) {
        return {
          profiles: cached.data,
          fromCache: true,
        };
      }
    }

    // fetch from API
    const result = await this.fetchFromApi(config);
    if (result.error) {
      return {
        fromCache: false,
        error: result.error,
      };
    }

    if (result.data) {
      // cache the new data
      this.setCachedData(result.data);

      return {
        profiles: result.data,
        fromCache: false,
      };
    }

    return {
      fromCache: false,
      error: createDataValidationError(config.instance),
    };
  }

  /**
   * Force refresh server profiles and update cache
   */
  async refreshProfiles(config: ProfileServiceConfig): Promise<{
    profiles?: ProfileResponse[];
    error?: AppError;
  }> {
    const result = await this.getProfiles(config, true);
    return {
      profiles: result.profiles,
      error: result.error,
    };
  }

  /**
   * Get the active profile for a specific timestamp, considering profile switch treatments
   */
  async getActiveProfile(
    config: ProfileServiceConfig,
    timestamp: number,
    treatments: Treatment[] = [],
  ): Promise<{
    activeProfile?: ActiveProfile;
    error?: AppError;
  }> {
    const profileResult = await this.getProfiles(config);

    if (profileResult.error || !profileResult.profiles || profileResult.profiles.length === 0) {
      return {
        error: profileResult.error || createDataValidationError(config.instance),
      };
    }

    const latestProfile = profileResult.profiles[0];

    // Find profile switch treatments that affect this timestamp
    const profileSwitches = treatments
      .filter((t) => t.eventType === "Profile Switch" && t.profile)
      .filter((t) => {
        const treatmentTime = new Date(t.created_at).getTime();
        const duration = t.duration ? t.duration * 60 * 1000 : Infinity; // duration in minutes -> ms
        return treatmentTime <= timestamp && (duration === Infinity || treatmentTime + duration > timestamp);
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); // Most recent first

    let activeProfileName = latestProfile.defaultProfile;
    let isDefault = true;
    let validFrom: number | undefined;
    let validUntil: number | undefined;

    if (profileSwitches.length > 0) {
      const activeSwitch = profileSwitches[0];
      activeProfileName = activeSwitch.profile!;
      isDefault = false;
      validFrom = new Date(activeSwitch.created_at).getTime();

      if (activeSwitch.duration) {
        validUntil = validFrom + activeSwitch.duration * 60 * 1000;
      }
    }

    const profileData = latestProfile.store[activeProfileName];
    if (!profileData) {
      return {
        error: createDataValidationError(config.instance),
      };
    }

    return {
      activeProfile: {
        name: activeProfileName,
        data: profileData,
        isDefault,
        validFrom,
        validUntil,
      },
    };
  }

  /**
   * Get target values for a specific timestamp
   */
  async getTargetsAtTimestamp(
    config: ProfileServiceConfig,
    timestamp: number,
    treatments: Treatment[] = [],
  ): Promise<{
    targets?: ProfileTargets;
    error?: AppError;
  }> {
    const activeProfileResult = await this.getActiveProfile(config, timestamp, treatments);

    if (activeProfileResult.error || !activeProfileResult.activeProfile) {
      return {
        error: activeProfileResult.error,
      };
    }

    const { activeProfile } = activeProfileResult;
    const targets = getTargetsAtTime(activeProfile.data, timestamp);

    return {
      targets: {
        low: targets.low,
        high: targets.high,
        profileName: activeProfile.name,
        isDefault: activeProfile.isDefault,
      },
    };
  }

  /**
   * Clear cached profile data
   */
  clearCache(): void {
    this.cache.remove(PROFILE_CACHE_KEY);
  }
}

// export singleton instance
export const profileService = new ProfileService();

export function getProfileConfig(): { config: ProfileServiceConfig | null; error: AppError | null } {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const preferencesError = createPreferencesError(preferences);

    if (preferencesError) {
      return { config: null, error: preferencesError };
    }

    return {
      config: {
        instance: preferences.instance,
        token: preferences.token,
      },
      error: null,
    };
  } catch {
    return {
      config: null,
      error: {
        type: "preferences-validation",
        message: "Failed to load preferences",
        instanceUrl: "",
      },
    };
  }
}
