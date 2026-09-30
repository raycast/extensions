import { getPreferenceValues } from "@raycast/api";
import { Treatment, AppError } from "../types";
import { createPreferencesError, createNetworkError, handleAppError } from "../utils/errorHandling";
import { BaseDataService } from "./baseDataService";
import { TREATMENTS_CACHE_KEY } from "../constants";

interface TreatmentServiceConfig {
  instance: string;
  token?: string;
}

/**
 * URL builder for treatments API
 */
class TreatmentUrlBuilder {
  buildUrl(config: TreatmentServiceConfig, lastTimestamp?: number): string {
    const url = new URL(`/api/v1/treatments.json`, config.instance);

    if (lastTimestamp) {
      // incremental fetch: get treatments newer than our latest
      url.searchParams.append("find[created_at][$gt]", new Date(lastTimestamp).toISOString());
      url.searchParams.append("count", "100");
    } else {
      // initial fetch: get last 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      url.searchParams.append("find[created_at][$gte]", twentyFourHoursAgo.toISOString());
      url.searchParams.append("count", "2500");
    }

    if (config.token && config.token.trim() !== "" && config.token.trim() !== " ") {
      url.searchParams.append("token", config.token.trim());
    }

    return url.toString();
  }
}

/**
 * Validator for treatment data
 */
class TreatmentValidator {
  isValid(treatment: unknown): treatment is Treatment {
    if (typeof treatment !== "object" || treatment === null) {
      return false;
    }

    const obj = treatment as Record<string, unknown>;
    return typeof obj.eventType === "string" && typeof obj.created_at === "string";
  }

  validateArray(data: unknown): data is Treatment[] {
    if (!Array.isArray(data)) {
      return false;
    }
    return data.every((treatment) => this.isValid(treatment));
  }
}

/**
 * Timestamp extractor for treatments
 */
class TreatmentTimestampExtractor {
  getTimestamp(item: Treatment): number {
    return new Date(item.eventTime || item.created_at).getTime();
  }
}

/**
 * Service to fetch and cache treatment data from Nightscout API
 */
class TreatmentService extends BaseDataService<Treatment> {
  constructor() {
    super(TREATMENTS_CACHE_KEY, new TreatmentUrlBuilder(), new TreatmentValidator(), new TreatmentTimestampExtractor());
  }

  /**
   * Get treatments, using cache if fresh or fetching from API if stale
   */
  async getTreatments(
    config: TreatmentServiceConfig,
    forceRefresh = false,
  ): Promise<{
    treatments: Treatment[];
    fromCache: boolean;
    error?: AppError;
  }> {
    const result = await this.getData(config, forceRefresh);
    return {
      treatments: result.data,
      fromCache: result.fromCache,
      error: result.error,
    };
  }

  /**
   * Force refresh treatments and update cache
   */
  async refreshTreatments(config: TreatmentServiceConfig): Promise<{
    treatments: Treatment[];
    error?: AppError;
  }> {
    const result = await this.refreshData(config);
    return {
      treatments: result.data,
      error: result.error,
    };
  }

  /**
   * Get cached treatments without making any API calls
   */
  getCachedTreatments(): Treatment[] {
    return this.getCached();
  }

  /**
   * Submit a new treatment to Nightscout API
   */
  async submitTreatments(
    config: TreatmentServiceConfig,
    treatments: Partial<Treatment>[],
  ): Promise<{
    success: boolean;
    error?: AppError;
  }> {
    try {
      const url = new URL(`/api/v1/treatments`, config.instance);

      if (config.token && config.token.trim() !== "" && config.token.trim() !== " ") {
        url.searchParams.append("token", config.token.trim());
      }

      const treatmentsData = treatments.map((treatment) => ({
        ...treatment,
        created_at: treatment.created_at || new Date().toISOString(),
      }));

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(treatmentsData),
      });

      if (!response.ok) {
        let error: Error;
        if (response.status === 401) {
          error = new Error("Unauthorized");
        } else if (response.status === 404) {
          error = new Error("Not Found");
        } else if (response.status === 429) {
          error = new Error("Too Many Requests");
        } else {
          error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const appError = createNetworkError(error, config.instance, Boolean(config.token));
        await handleAppError(appError, "treatment submission");

        return {
          success: false,
          error: appError,
        };
      }

      // force refresh cache after successful submission
      await this.refreshData(config);

      return { success: true };
    } catch (error) {
      console.error("Failed to submit treatment:", error);

      // check if it's already an AppError by checking for the type property
      const isAppError = (err: unknown): err is AppError => {
        return typeof err === "object" && err !== null && "type" in err;
      };

      const appError: AppError = isAppError(error)
        ? error
        : {
            type: "connection",
            message: error instanceof Error ? error.message : "Unknown error occurred",
            instanceUrl: config.instance,
          };

      await handleAppError(appError, "treatment submission");

      return {
        success: false,
        error: appError,
      };
    }
  }
}

// export a singleton instance
export const treatmentService = new TreatmentService();

// helper function to get config from preferences
export function getTreatmentConfig(): TreatmentServiceConfig {
  const preferences = getPreferenceValues<Preferences>();
  const preferencesError = createPreferencesError(preferences);

  if (preferencesError) {
    throw preferencesError;
  }

  return {
    instance: preferences.instance,
    token: preferences.token,
  };
}
