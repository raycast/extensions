import { AtombergApiService } from "./atomberg-api";
import type { Preferences } from "../types";

/**
 * Singleton manager for Atomberg API service instances
 *
 * This class implements a singleton pattern to manage multiple API service
 * instances based on different user preferences. It provides caching to
 * avoid recreating services for the same credentials and ensures efficient
 * resource management across the application.
 *
 * @remarks
 * - Uses singleton pattern to ensure only one manager exists
 * - Caches API service instances based on preference combinations
 * - Automatically creates new services for new credential combinations
 * - Provides cache clearing for credential management
 */
class ApiServiceManager {
  /** Singleton instance of the manager */
  private static instance: ApiServiceManager;
  /** Map of cached API service instances keyed by preference combination */
  private apiInstances = new Map<string, AtombergApiService>();

  /** Private constructor to enforce singleton pattern */
  private constructor() {}

  /**
   * Gets the singleton instance of ApiServiceManager
   *
   * @returns The singleton instance of ApiServiceManager
   */
  static getInstance(): ApiServiceManager {
    if (!ApiServiceManager.instance) {
      ApiServiceManager.instance = new ApiServiceManager();
    }
    return ApiServiceManager.instance;
  }

  /**
   * Gets or creates an API service instance for the given preferences
   *
   * This method implements a caching strategy where API services are
   * created once per unique preference combination and reused for
   * subsequent requests with the same credentials.
   *
   * @param preferences - User preferences containing API credentials
   * @returns Cached or newly created AtombergApiService instance
   */
  getApiService(preferences: Preferences): AtombergApiService {
    const key = this.createKey(preferences);

    if (!this.apiInstances.has(key)) {
      this.apiInstances.set(key, new AtombergApiService(preferences));
    }

    return this.apiInstances.get(key)!;
  }

  /**
   * Creates a unique key for caching API service instances
   *
   * The key is based on the combination of API key and refresh token,
   * ensuring that different credential combinations get separate
   * service instances.
   *
   * @param preferences - User preferences to create a key from
   * @returns Unique string key for the preference combination
   *
   * @private
   */
  private createKey(preferences: Preferences): string {
    return `${preferences.apiKey || ""}-${preferences.refreshToken || ""}`;
  }

  /**
   * Clears all cached API service instances
   *
   * This method is useful when users log out or change credentials,
   * ensuring that old service instances are properly disposed of
   * and new ones are created with fresh credentials.
   */
  clearCache(): void {
    this.apiInstances.clear();
  }
}

/**
 * Singleton instance of ApiServiceManager for use throughout the application
 *
 * This exported instance provides global access to the API service manager
 * without needing to call getInstance() repeatedly.
 */
export const apiServiceManager = ApiServiceManager.getInstance();
