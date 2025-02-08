import { Explorer } from "@harmonyhub/discover";
import { HarmonyHub } from "../../types/harmony";
import { Logger } from "../logger";
import { LocalStorage } from "@raycast/api";
import { HarmonyError, ErrorCategory } from "../../types/errors";

// Constants
const DISCOVERY_TIMEOUT = 5000; // Reduced from 10s to 5s
const DISCOVERY_COMPLETE_DELAY = 500; // Wait 500ms after finding a hub before completing
const CACHE_KEY = "harmony-hubs";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CachedHubs {
  hubs: HarmonyHub[];
  timestamp: number;
}

// Hub data from discovery event
interface HubDiscoveryData {
  uuid: string;
  ip: string;
  friendlyName: string;
  fullHubInfo: {
    hubId: string;
    productId: string;
    current_fw_version: string;
    protocolVersion: string;
    port: string;
    remoteId: string;
  };
}

export class HarmonyManager {
  private explorer: Explorer | null = null;
  private isDiscovering = false;
  private discoveryPromise: Promise<HarmonyHub[]> | null = null;
  private completeTimeout: NodeJS.Timeout | null = null;

  /**
   * Create a HarmonyHub instance from discovery data
   */
  private createHub(data: HubDiscoveryData): HarmonyHub {
    // Validate required fields
    if (!data.friendlyName || !data.ip || !data.uuid || !data.fullHubInfo?.hubId) {
      throw new HarmonyError(
        "Invalid hub data received",
        ErrorCategory.VALIDATION,
        new Error(`Missing required fields: ${JSON.stringify(data)}`)
      );
    }

    return {
      id: data.uuid,
      name: data.friendlyName,
      ip: data.ip,
      hubId: data.fullHubInfo.hubId,
      remoteId: data.fullHubInfo.remoteId,
      version: data.fullHubInfo.current_fw_version,
      port: data.fullHubInfo.port,
      productId: data.fullHubInfo.productId,
      protocolVersion: data.fullHubInfo.protocolVersion
    };
  }

  /**
   * Start discovery of Harmony Hubs on the network
   */
  public async startDiscovery(
    onProgress?: (progress: number, message: string) => void
  ): Promise<HarmonyHub[]> {
    // Check cache first
    try {
      const cached = await this.getCachedHubs();
      if (cached) {
        Logger.info("Using cached hubs");
        onProgress?.(1, `Found ${cached.length} cached hub(s)`);
        return cached;
      }
    } catch (error) {
      Logger.warn("Failed to read cache:", error);
      // Continue with discovery even if cache read fails
    }

    // If discovery is already in progress, return the existing promise
    if (this.discoveryPromise) {
      return this.discoveryPromise;
    }

    try {
      // Ensure cleanup of any previous explorer
      await this.cleanup();

      this.isDiscovering = true;
      onProgress?.(0, "Starting discovery process");
      this.explorer = new Explorer();

      // Create and store the discovery promise
      this.discoveryPromise = new Promise<HarmonyHub[]>((resolve, reject) => {
        if (!this.explorer) {
          reject(new HarmonyError("Explorer not initialized", ErrorCategory.STATE));
          return;
        }

        const hubs: HarmonyHub[] = [];

        // Function to complete discovery
        const completeDiscovery = async () => {
          await this.cleanup();
          if (hubs.length > 0) {
            await this.cacheHubs(hubs);
          }
          resolve(hubs);
        };

        // Set timeout to stop discovery after DISCOVERY_TIMEOUT
        const timeout = setTimeout(async () => {
          Logger.info("Discovery timeout");
          await completeDiscovery();
        }, DISCOVERY_TIMEOUT);

        this.explorer.on("online", (data: HubDiscoveryData) => {
          try {
            const hub = this.createHub(data);
            
            // Check for duplicate hubs
            if (!hubs.some(h => h.hubId === hub.hubId)) {
              hubs.push(hub);
              onProgress?.(0.5, `Found hub: ${hub.name}`);

              // Clear any existing completion timeout
              if (this.completeTimeout) {
                clearTimeout(this.completeTimeout);
              }

              // Set a new completion timeout
              this.completeTimeout = setTimeout(async () => {
                clearTimeout(timeout);
                await completeDiscovery();
              }, DISCOVERY_COMPLETE_DELAY);
            } else {
              Logger.info(`Skipping duplicate hub: ${hub.name}`);
            }
          } catch (error) {
            Logger.error("Failed to process hub data:", error);
            // Don't reject here, just log and continue discovery
          }
        });

        this.explorer.on("error", async (error: Error) => {
          Logger.error("Discovery error:", error);
          clearTimeout(timeout);
          if (this.completeTimeout) {
            clearTimeout(this.completeTimeout);
          }
          await this.cleanup();
          reject(new HarmonyError(
            "Hub discovery failed",
            ErrorCategory.HUB_COMMUNICATION,
            error
          ));
        });

        // Start discovery
        this.explorer.start();
      });

      // Return the discovery promise
      return await this.discoveryPromise;

    } catch (error) {
      Logger.error("Failed to start discovery:", error);
      throw new HarmonyError(
        "Failed to start hub discovery",
        ErrorCategory.HUB_COMMUNICATION,
        error as Error
      );
    } finally {
      this.isDiscovering = false;
      this.discoveryPromise = null;
    }
  }

  /**
   * Cache discovered hubs
   */
  private async cacheHubs(hubs: HarmonyHub[]): Promise<void> {
    try {
      const cache: CachedHubs = {
        hubs,
        timestamp: Date.now()
      };
      await LocalStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      Logger.info(`Cached ${hubs.length} hubs`);
    } catch (error) {
      Logger.warn("Failed to cache hubs:", error);
      throw new HarmonyError(
        "Failed to cache hubs",
        ErrorCategory.STORAGE,
        error as Error
      );
    }
  }

  /**
   * Get cached hubs if available and not expired
   */
  private async getCachedHubs(): Promise<HarmonyHub[] | null> {
    try {
      const cached = await LocalStorage.getItem<string>(CACHE_KEY);
      if (!cached) return null;

      const { hubs, timestamp } = JSON.parse(cached) as CachedHubs;
      
      // Check if cache is expired
      if (Date.now() - timestamp > CACHE_TTL) {
        Logger.info("Cache expired");
        await LocalStorage.removeItem(CACHE_KEY);
        return null;
      }

      // Validate cached hub data
      for (const hub of hubs) {
        if (!hub.id || !hub.name || !hub.ip || !hub.hubId) {
          Logger.warn("Invalid hub data in cache, clearing cache");
          await LocalStorage.removeItem(CACHE_KEY);
          return null;
        }
      }

      return hubs;
    } catch (error) {
      Logger.warn("Failed to get cached hubs:", error);
      throw new HarmonyError(
        "Failed to read hub cache",
        ErrorCategory.STORAGE,
        error as Error
      );
    }
  }

  /**
   * Clean up discovery resources
   */
  public async cleanup(): Promise<void> {
    if (this.explorer) {
      try {
        this.explorer.stop();
        this.explorer.removeAllListeners();
      } catch (error) {
        Logger.error("Error stopping explorer:", error);
      }
      this.explorer = null;
    }

    if (this.completeTimeout) {
      clearTimeout(this.completeTimeout);
      this.completeTimeout = null;
    }

    this.isDiscovering = false;
    this.discoveryPromise = null;
  }

  /**
   * Clear all cached data
   */
  public async clearCache(): Promise<void> {
    try {
      Logger.info("Clearing all Harmony caches");
      
      // Clear hub cache
      await LocalStorage.removeItem(CACHE_KEY);
      
      // Clear all hub-specific config caches
      const allKeys = await LocalStorage.allItems();
      for (const key of Object.keys(allKeys)) {
        if (key.startsWith('harmony-config-')) {
          await LocalStorage.removeItem(key);
        }
      }
      
      Logger.info("All caches cleared");
    } catch (error) {
      Logger.error("Failed to clear caches:", error);
      throw new HarmonyError(
        "Failed to clear caches",
        ErrorCategory.STORAGE,
        error as Error
      );
    }
  }
}
