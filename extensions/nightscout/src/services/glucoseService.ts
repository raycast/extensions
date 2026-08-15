import { getPreferenceValues } from "@raycast/api";
import { GlucoseEntry, AppError } from "../types";
import { createPreferencesError } from "../utils/errorHandling";
import { BaseDataService } from "./baseDataService";
import { GLUCOSE_CACHE_KEY } from "../constants";

interface GlucoseServiceConfig {
  instance: string;
  token?: string;
}

/**
 * URL builder for glucose entries API
 */
class GlucoseUrlBuilder {
  buildUrl(config: GlucoseServiceConfig, lastReadingTimestamp?: number): string {
    const url = new URL(`/api/v1/entries.json`, config.instance);

    if (lastReadingTimestamp) {
      // incremental fetch: get readings newer than our latest
      url.searchParams.append("find[date][$gt]", lastReadingTimestamp.toString());
      url.searchParams.append("count", "100");
    } else {
      // initial fetch: get last 24 hours
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      url.searchParams.append("find[date][$gte]", twentyFourHoursAgo.toString());
      url.searchParams.append("count", "2500");
    }

    if (config.token && config.token.trim() !== "" && config.token.trim() !== " ") {
      url.searchParams.append("token", config.token.trim());
    }

    return url.toString();
  }
}

/**
 * Validator for glucose entry data
 */
class GlucoseValidator {
  isValid(reading: unknown): reading is GlucoseEntry {
    if (typeof reading !== "object" || reading === null) {
      return false;
    }

    const obj = reading as Record<string, unknown>;
    return typeof obj.sgv === "number" && typeof obj.date === "number";
  }

  validateArray(data: unknown): data is GlucoseEntry[] {
    if (!Array.isArray(data)) {
      return false;
    }
    return data.every((reading) => this.isValid(reading));
  }
}

/**
 * Timestamp extractor for glucose entries
 */
class GlucoseTimestampExtractor {
  getTimestamp(item: GlucoseEntry): number {
    return item.date;
  }
}

/**
 * Service to fetch and cache glucose readings from Nightscout API
 */
class GlucoseService extends BaseDataService<GlucoseEntry> {
  constructor() {
    super(GLUCOSE_CACHE_KEY, new GlucoseUrlBuilder(), new GlucoseValidator(), new GlucoseTimestampExtractor());
  }

  /**
   * Get glucose readings, using cache if fresh or fetching from API if stale
   */
  async getReadings(
    config: GlucoseServiceConfig,
    forceRefresh = false,
  ): Promise<{
    readings: GlucoseEntry[];
    fromCache: boolean;
    error?: AppError;
  }> {
    const result = await this.getData(config, forceRefresh);
    return {
      readings: result.data,
      fromCache: result.fromCache,
      error: result.error,
    };
  }

  /**
   * Force refresh glucose readings and update cache
   */
  async refreshReadings(config: GlucoseServiceConfig): Promise<{
    readings: GlucoseEntry[];
    error?: AppError;
  }> {
    const result = await this.refreshData(config);
    return {
      readings: result.data,
      error: result.error,
    };
  }

  /**
   * Get cached readings without making any API calls
   */
  getCachedReadings(): GlucoseEntry[] {
    return this.getCached();
  }
}

// export a singleton instance
export const glucoseService = new GlucoseService();

// helper function to get config from preferences
export function getGlucoseConfig(): GlucoseServiceConfig {
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
