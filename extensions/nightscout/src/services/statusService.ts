import { Cache, getPreferenceValues } from "@raycast/api";
import { StatusResponse, AppError } from "../types";
import { createNetworkError, createDataValidationError, createPreferencesError } from "../utils/errorHandling";
import { STATUS_CACHE_KEY } from "../constants";

interface StatusServiceConfig {
  instance: string;
  token?: string;
}

interface CachedStatus {
  data: StatusResponse;
  lastFetched: number;
}

/**
 * Validator for status response data
 */
class StatusValidator {
  isValid(status: unknown): status is StatusResponse {
    if (typeof status !== "object" || status === null) {
      return false;
    }

    const obj = status as Record<string, unknown>;
    return (
      typeof obj.status === "string" &&
      typeof obj.name === "string" &&
      typeof obj.version === "string" &&
      typeof obj.settings === "object" &&
      obj.settings !== null &&
      typeof (obj.settings as Record<string, unknown>).units === "string"
    );
  }
}

/**
 * Service to fetch and cache server status from Nightscout API
 */
class StatusService {
  private cache = new Cache();
  private readonly CACHE_DURATION = 5 * 60 * 1000;
  private validator = new StatusValidator();

  private validateUrlProtocol(urlString: string): boolean {
    try {
      const url = new URL(urlString);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  private buildUrl(config: StatusServiceConfig): string {
    const url = new URL(`/api/v1/status.json`, config.instance);

    if (config.token && config.token.trim() !== "" && config.token.trim() !== " ") {
      url.searchParams.append("token", config.token.trim());
    }

    return url.toString();
  }

  private getCachedData(): CachedStatus | null {
    try {
      const cached = this.cache.get(STATUS_CACHE_KEY);
      if (!cached) return null;

      const parsedCache = JSON.parse(cached) as CachedStatus;
      const now = Date.now();

      // Check if cache is still fresh
      if (now - parsedCache.lastFetched > this.CACHE_DURATION) {
        return null;
      }

      return parsedCache;
    } catch {
      return null;
    }
  }

  private setCachedData(data: StatusResponse): void {
    try {
      const cachedData: CachedStatus = {
        data,
        lastFetched: Date.now(),
      };
      this.cache.set(STATUS_CACHE_KEY, JSON.stringify(cachedData));
    } catch {
      // silently fail cache operations
    }
  }

  private async fetchFromApi(config: StatusServiceConfig): Promise<{
    data?: StatusResponse;
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

      if (!this.validator.isValid(data)) {
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
   * Get server status, using cache if fresh or fetching from API if stale
   */
  async getStatus(
    config: StatusServiceConfig,
    forceRefresh = false,
  ): Promise<{
    status?: StatusResponse;
    fromCache: boolean;
    error?: AppError;
  }> {
    // try cache first if not forcing refresh
    if (!forceRefresh) {
      const cached = this.getCachedData();
      if (cached) {
        return {
          status: cached.data,
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
        status: result.data,
        fromCache: false,
      };
    }

    return {
      fromCache: false,
      error: createDataValidationError(config.instance),
    };
  }

  /**
   * Force refresh server status and update cache
   */
  async refreshStatus(config: StatusServiceConfig): Promise<{
    status?: StatusResponse;
    error?: AppError;
  }> {
    const result = await this.getStatus(config, true);
    return {
      status: result.status,
      error: result.error,
    };
  }

  /**
   * Clear cached status data
   */
  clearCache(): void {
    this.cache.remove(STATUS_CACHE_KEY);
  }

  /**
   * Get units setting from server status
   */
  async getUnits(config: StatusServiceConfig): Promise<{
    units?: "mg/dl" | "mmol";
    fromCache: boolean;
    error?: AppError;
  }> {
    const result = await this.getStatus(config);
    return {
      units: result.status?.settings.units,
      fromCache: result.fromCache,
      error: result.error,
    };
  }
}

// Export singleton instance
export const statusService = new StatusService();

export function getStatusConfig(): { config: StatusServiceConfig | null; error: AppError | null } {
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
