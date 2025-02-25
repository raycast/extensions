/**
 * Manager class for discovering and managing Harmony Hubs on the network.
 * Handles hub discovery, caching, and validation of hub data.
 * @module
 */

import { Explorer } from "@harmonyhub/discover";
import { LocalStorage, showToast, Toast } from "@raycast/api";

import { HarmonyClient } from "../../services/harmony/harmonyClient";
import { HarmonyError, ErrorCategory } from "../../types/core/errors";
import { HarmonyHub } from "../../types/core/harmony";
import { debug, error, info, warn } from "../logger";

/** Discovery timeout in milliseconds */
const DISCOVERY_TIMEOUT = 5000;
/** Delay after finding a hub before completing discovery */
const DISCOVERY_COMPLETE_DELAY = 500;
/** Key for storing hub cache */
const CACHE_KEY = "harmony-hubs";
/** Cache time-to-live in milliseconds (24 hours) */
const CACHE_TTL = 24 * 60 * 60 * 1000;

/**
 * Interface for cached hub data
 * @interface CachedHubs
 */
interface CachedHubs {
  /** List of discovered hubs */
  hubs: HarmonyHub[];
  /** Timestamp when cache was created */
  timestamp: number;
}

/**
 * Interface for raw hub data received from discovery process
 * @interface HubDiscoveryData
 */
interface HubDiscoveryData {
  /** Unique identifier for the hub */
  uuid: string;
  /** IP address of the hub */
  ip: string;
  /** User-friendly name of the hub */
  friendlyName: string;
  /** Additional hub information */
  fullHubInfo: {
    /** Hub ID from Logitech service */
    hubId: string;
    /** Product ID of the hub */
    productId: string;
    /** Current firmware version */
    current_fw_version: string;
    /** Protocol version supported by the hub */
    protocolVersion: string;
    /** Port number for hub communication */
    port: string;
    /** Remote ID assigned by Harmony service */
    remoteId: string;
  };
}

/**
 * Manager class for discovering and managing Harmony Hubs.
 * Handles network discovery, caching, and hub validation.
 */
export class HarmonyManager {
  /** Hub discovery explorer instance */
  private explorer: Explorer | null = null;
  /** Whether discovery is currently in progress */
  private isDiscovering = false;
  /** Promise for current discovery operation */
  private discoveryPromise: Promise<HarmonyHub[]> | null = null;
  /** Timeout for discovery completion */
  private completeTimeout: NodeJS.Timeout | null = null;

  /**
   * Creates a validated HarmonyHub instance from discovery data
   * @param data - Raw hub data from discovery process
   * @returns Validated HarmonyHub instance
   * @throws {HarmonyError} If hub data is invalid
   */
  private createHub(data: HubDiscoveryData): HarmonyHub {
    // Validate required fields
    if (!data.friendlyName || !data.ip || !data.uuid || !data.fullHubInfo?.hubId) {
      throw new HarmonyError(
        "Invalid hub data received",
        ErrorCategory.VALIDATION,
        new Error(`Missing required fields: ${JSON.stringify(data)}`),
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
      protocolVersion: data.fullHubInfo.protocolVersion,
    };
  }

  /**
   * Verify a hub is accessible without creating a new connection
   * @param hub - The hub to verify
   * @returns True if hub is accessible
   */
  private async verifyHub(hub: HarmonyHub): Promise<boolean> {
    try {
      // Get existing client if available
      const existingClient = HarmonyClient.getClient(hub);

      // If client is already connected, just verify the connection
      if (existingClient.isClientConnected()) {
        debug(`Hub ${hub.name} already connected, skipping verification`);
        return true;
      }

      // Try a lightweight connection test
      debug(`Verifying hub ${hub.name} is accessible`);
      await existingClient.connect();
      return true;
    } catch (err) {
      warn(`Failed to verify hub ${hub.name}:`, err);
      return false;
    }
  }

  /**
   * Starts discovery of Harmony Hubs on the network.
   * Checks cache first, then performs network discovery if needed.
   * @param onProgress - Optional callback for progress updates
   * @returns Promise resolving to list of discovered hubs
   * @throws {HarmonyError} If discovery fails
   */
  public async startDiscovery(onProgress?: (progress: number, message: string) => void): Promise<HarmonyHub[]> {
    // Check cache first
    try {
      const cached = await this.getCachedHubs();
      if (cached) {
        info(`Found ${cached.length} cached hubs`);
        onProgress?.(0.25, `Found ${cached.length} cached hub(s)`);

        // Verify each cached hub is still accessible
        debug("Verifying cached hubs are accessible");
        const verifiedHubs: HarmonyHub[] = [];
        for (const hub of cached) {
          try {
            onProgress?.(0.5, `Verifying hub: ${hub.name}...`);
            if (await this.verifyHub(hub)) {
              verifiedHubs.push(hub);
              info(`Verified hub ${hub.name} is accessible`);
              onProgress?.(0.75, `Verified hub: ${hub.name}`);
            } else {
              warn(`Cached hub ${hub.name} is no longer accessible`);
            }
          } catch (err) {
            warn(`Failed to verify hub ${hub.name}:`, err);
          }
        }

        if (verifiedHubs.length > 0) {
          info(`${verifiedHubs.length} of ${cached.length} cached hubs verified`);
          if (verifiedHubs.length !== cached.length) {
            // Update cache with only verified hubs
            await this.cacheHubs(verifiedHubs);
          }
          if (verifiedHubs.length === 1) {
            const hub = verifiedHubs[0];
            if (hub) {
              await showToast({
                style: Toast.Style.Success,
                title: "Auto-connecting to Hub",
                message: `Found single Harmony Hub: ${hub.name}`,
              });
            }
          }
          onProgress?.(1, `Found ${verifiedHubs.length} hub(s)`);
          return verifiedHubs;
        }

        info("No cached hubs are accessible, proceeding with discovery");
      }
    } catch (error) {
      warn("Failed to read cache:", error);
      // Continue with discovery even if cache read fails
    }

    // If discovery is already in progress, return the existing promise
    if (this.discoveryPromise) {
      info("Discovery already in progress, returning existing promise");
      return this.discoveryPromise;
    }

    try {
      // Ensure cleanup of any previous explorer
      await this.cleanup();

      this.isDiscovering = true;
      onProgress?.(0.1, "Starting discovery process");
      info("Starting hub discovery process");
      this.explorer = new Explorer();

      // Create and store the discovery promise
      this.discoveryPromise = new Promise<HarmonyHub[]>((resolve, reject) => {
        if (!this.explorer) {
          const error = new HarmonyError("Explorer not initialized", ErrorCategory.STATE);
          info("Discovery failed - explorer not initialized");
          reject(error);
          return;
        }

        const hubs: HarmonyHub[] = [];
        let discoveryProgress = 0.1;

        // Function to complete discovery
        const completeDiscovery = async (): Promise<HarmonyHub[]> => {
          await this.cleanup();
          if (hubs.length > 0) {
            info(`Discovery completed successfully, found ${hubs.length} hubs`);
            await this.cacheHubs(hubs);
            onProgress?.(1, `Found ${hubs.length} hub(s)`);
          } else {
            info("Discovery completed but no hubs were found");
            onProgress?.(1, "No hubs found");
          }
          resolve(hubs);
          return hubs;
        };

        // Set timeout to stop discovery after DISCOVERY_TIMEOUT
        const timeout = setTimeout(async () => {
          info("Discovery timeout reached");
          await completeDiscovery();
        }, DISCOVERY_TIMEOUT);

        this.explorer.on("online", (data: HubDiscoveryData) => {
          try {
            debug("Received hub data", { data });
            const hub = this.createHub(data);

            // Check for duplicate hubs
            if (!hubs.some((h) => h.hubId === hub.hubId)) {
              hubs.push(hub);
              info(`Found hub: ${hub.name} (${hub.ip})`);

              // Update progress - increment by 0.3 for each hub found, max at 0.9
              discoveryProgress = Math.min(0.9, discoveryProgress + 0.3);
              onProgress?.(discoveryProgress, `Found hub: ${hub.name}`);

              // If we found a hub, wait a bit longer for others
              if (this.completeTimeout) {
                clearTimeout(this.completeTimeout);
              }
              this.completeTimeout = setTimeout(async () => {
                await completeDiscovery();
              }, DISCOVERY_COMPLETE_DELAY);
            } else {
              info(`Skipping duplicate hub: ${hub.name} (${hub.ip})`);
            }
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            error("Failed to process hub data:", errorMessage);
            // Don't reject here, just log and continue discovery
          }
        });

        this.explorer.on("error", async (err: Error) => {
          error("Discovery error:", err.message);
          clearTimeout(timeout);
          if (this.completeTimeout) {
            clearTimeout(this.completeTimeout);
          }
          await completeDiscovery();
          reject(err);
        });

        // Start discovery
        debug("Starting explorer");
        this.explorer.start();
      });

      // Return the discovery promise
      return await this.discoveryPromise;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      error("Failed to start discovery:", errorMessage);
      throw new HarmonyError(
        "Failed to start hub discovery",
        ErrorCategory.HUB_COMMUNICATION,
        err instanceof Error ? err : undefined,
      );
    } finally {
      this.isDiscovering = false;
    }
  }

  /**
   * Performs network discovery of Harmony Hubs.
   * Uses the Harmony discovery protocol to find hubs on the local network.
   * @returns Promise resolving to list of discovered hubs
   * @throws {HarmonyError} If discovery fails
   * @private
   */
  private async discoverHubs(): Promise<HarmonyHub[]> {
    return [];
  }

  /**
   * Caches discovered hubs in local storage.
   * @param hubs - List of hubs to cache
   * @throws {HarmonyError} If caching fails
   * @private
   */
  private async cacheHubs(hubs: HarmonyHub[]): Promise<void> {
    try {
      const cache: CachedHubs = {
        hubs,
        timestamp: Date.now(),
      };
      await LocalStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      info(`Cached ${hubs.length} hubs`);
    } catch (error) {
      warn("Failed to cache hubs:", error);
      throw new HarmonyError("Failed to cache hubs", ErrorCategory.STORAGE, error as Error);
    }
  }

  /**
   * Retrieves cached hubs if available and not expired.
   * @returns Promise resolving to cached hubs or null if no valid cache exists
   * @throws {HarmonyError} If reading cache fails
   * @private
   */
  private async getCachedHubs(): Promise<HarmonyHub[] | null> {
    try {
      const cached = await LocalStorage.getItem<string>(CACHE_KEY);
      if (!cached) return null;

      const { hubs, timestamp } = JSON.parse(cached) as CachedHubs;

      // Check if cache is expired
      if (Date.now() - timestamp > CACHE_TTL) {
        info("Cache expired");
        await LocalStorage.removeItem(CACHE_KEY);
        return null;
      }

      // Validate cached hub data
      for (const hub of hubs) {
        if (!hub.id || !hub.name || !hub.ip || !hub.hubId) {
          warn("Invalid hub data in cache, clearing cache");
          await LocalStorage.removeItem(CACHE_KEY);
          return null;
        }
      }

      return hubs;
    } catch (error) {
      warn("Failed to get cached hubs:", error);
      throw new HarmonyError("Failed to read hub cache", ErrorCategory.STORAGE, error as Error);
    }
  }

  /**
   * Cleans up discovery resources.
   * Stops the explorer and clears timeouts.
   */
  public async cleanup(): Promise<void> {
    try {
      if (this.explorer) {
        this.explorer.stop();
        this.explorer.removeAllListeners();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      error("Error stopping explorer:", errorMessage);
    }
    this.explorer = null;
    this.discoveryPromise = null;
    this.completeTimeout = null;
  }

  /**
   * Clears all caches including hub discovery and configs.
   * @throws {HarmonyError} If clearing caches fails
   */
  public async clearAllCaches(): Promise<void> {
    try {
      info("Clearing all Harmony caches");

      // Clear hub discovery cache
      await LocalStorage.removeItem(CACHE_KEY);

      // Clear hub-specific caches
      const hubs = await this.getCachedHubs();
      if (hubs) {
        for (const hub of hubs) {
          const client = HarmonyClient.getClient(hub);
          await client.clearCache();
        }
      }

      info("All caches cleared");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      error("Failed to clear caches:", errorMessage);
      throw new HarmonyError("Failed to clear caches", ErrorCategory.STORAGE, err instanceof Error ? err : undefined);
    }
  }

  /**
   * Clears all cached data.
   * Removes hub cache and all hub-specific config caches.
   * @throws {HarmonyError} If clearing cache fails
   */
  public async clearCache(): Promise<void> {
    try {
      info("Clearing all Harmony caches");

      // Clear hub cache
      await LocalStorage.removeItem(CACHE_KEY);

      // Clear all hub-specific config caches
      const allKeys = await LocalStorage.allItems();
      for (const key of Object.keys(allKeys)) {
        if (key.startsWith("harmony-config-")) {
          await LocalStorage.removeItem(key);
        }
      }

      info("All caches cleared");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      error("Failed to clear caches:", { error: errorMessage });
      throw new HarmonyError("Failed to clear caches", ErrorCategory.STORAGE, err instanceof Error ? err : undefined);
    }
  }

  /**
   * Completes the discovery process, cleaning up resources
   * @private
   */
  private completeDiscovery(): void {
    this.cleanup();
    this.isDiscovering = false;
    this.discoveryPromise = null;
  }
}
