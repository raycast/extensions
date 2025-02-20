/**
 * Client for communicating with a Harmony Hub.
 * Handles connection, command execution, activity management, and state caching.
 * @module
 */

import getHarmonyClient from "@harmonyhub/client-ws";
import { getPreferenceValues, LocalStorage } from "@raycast/api";

import { HarmonyError, ErrorCategory } from "../../types/core/errors";
import {
  HarmonyHub,
  HarmonyDevice,
  HarmonyActivity,
  HarmonyCommand,
  isHarmonyDevice,
  isHarmonyActivity,
} from "../../types/core/harmony";
import { debug, error, info, warn } from "../logger";

/** Cache expiration time in milliseconds (24 hours) */
const CACHE_EXPIRY = 24 * 60 * 60 * 1000;

/**
 * Interface for cached hub configuration
 * @interface CachedConfig
 */
interface CachedConfig {
  /** List of devices associated with the hub */
  devices: HarmonyDevice[];
  /** List of activities configured on the hub */
  activities: HarmonyActivity[];
  /** Timestamp when the cache was created */
  timestamp: number;
}

/**
 * Interface for command execution body
 * @interface HarmonyCommandBody
 */
interface HarmonyCommandBody {
  /** Command identifier */
  command: string;
  /** Target device identifier */
  deviceId: string;
  /** Command type (e.g., "IRCommand") */
  type: string;
}

/**
 * Interface for command function configuration
 * @interface CommandFunction
 */
interface CommandFunction {
  /** Function name */
  name: string;
  /** Display label */
  label?: string;
  /** Command action configuration */
  action?: {
    /** Command identifier */
    command?: string;
  };
}

/**
 * Interface for device control group
 * @interface ControlGroup
 */
interface ControlGroup {
  /** Group name */
  name: string;
  /** List of functions in this group */
  function: CommandFunction[];
}

/**
 * Interface for raw device data from hub
 * @interface RawDevice
 */
interface RawDevice {
  /** Device identifier */
  id: string;
  /** Display label */
  label?: string;
  /** Device type */
  type?: string;
  /** List of control groups */
  controlGroup: ControlGroup[];
}

/**
 * Interface for raw hub configuration
 * @interface RawConfig
 */
interface RawConfig {
  /** List of devices */
  device: RawDevice[];
}

/**
 * Interface for raw activity data from hub
 * @interface RawActivity
 */
interface RawActivity {
  /** Activity identifier */
  id: string;
  /** Activity display label */
  label: string;
  /** Activity type */
  type: string;
}

/**
 * Client for communicating with a Harmony Hub
 * Handles connection, command execution, and activity management
 */
export class HarmonyClient {
  /** Map of active clients by hub ID */
  private static activeClients: Map<string, HarmonyClient> = new Map();

  /** Get or create a client for a hub */
  public static getClient(hub: HarmonyHub): HarmonyClient {
    const existingClient = this.activeClients.get(hub.hubId);
    if (existingClient) {
      debug(`Reusing existing client for hub ${hub.name}`);
      return existingClient;
    }

    debug(`Creating new client for hub ${hub.name}`);
    const client = new HarmonyClient(hub);
    this.activeClients.set(hub.hubId, client);
    return client;
  }

  /** Connected client instance */
  private client: Awaited<ReturnType<typeof getHarmonyClient>> | null = null;
  /** Connection state */
  private isConnected = false;
  /** The hub this client is connected to */
  public readonly hub: HarmonyHub;
  /** Cache key for this hub's configuration */
  private cacheKey: string;

  /**
   * Creates a new HarmonyClient instance
   * @param hub - The Harmony Hub to connect to
   */
  private constructor(hub: HarmonyHub) {
    this.hub = hub;
    this.cacheKey = `harmony-config-${hub.hubId}`;
  }

  /**
   * Check if the client is currently connected
   * @returns True if connected, false otherwise
   */
  public isClientConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Connects to the Harmony Hub and retrieves its configuration.
   * Establishes WebSocket connection and verifies connectivity by fetching initial config.
   * Sets up disconnect handler and validates connection state.
   * @throws {HarmonyError} If connection fails or initial config cannot be retrieved
   */
  public async connect(): Promise<void> {
    if (this.isConnected) {
      info(`Already connected to hub ${this.hub.name}`);
      return;
    }

    try {
      info(`Initiating connection to hub ${this.hub.name} (${this.hub.ip})`);

      // Create client with remoteId if available for faster connection
      debug("Creating Harmony client", {
        ip: this.hub.ip,
        port: this.hub.port,
        remoteId: this.hub.remoteId,
      });

      this.client = await getHarmonyClient(this.hub.ip);

      // Setup disconnect handler before setting connected state
      this.client?.on("disconnected", () => {
        warn(`Disconnected from hub ${this.hub.name}`);
        this.isConnected = false;
        // Remove from active clients on disconnect
        HarmonyClient.activeClients.delete(this.hub.hubId);
      });

      // Verify connection by attempting to get config
      debug("Verifying connection by fetching initial config");

      // Load both devices and activities to ensure proper caching
      const [devices, activities] = await Promise.all([this.getDevicesFromHub(), this.getActivitiesFromHub()]);

      // Only set connected state after successful verification
      this.isConnected = true;
      info(`Successfully connected to hub ${this.hub.name}`);

      // Cache the complete config
      await this.updateConfigCache(devices, activities);

      debug("Initial config loaded and cached", {
        hubName: this.hub.name,
        deviceCount: devices.length,
        activityCount: activities.length,
      });

      return;
    } catch (err) {
      this.isConnected = false;
      this.client = null;
      // Remove from active clients on error
      HarmonyClient.activeClients.delete(this.hub.hubId);
      const harmonyError = new HarmonyError(
        "Failed to connect to hub",
        ErrorCategory.HUB_COMMUNICATION,
        err instanceof Error ? err : undefined,
      );
      error("Connection failed", { error: harmonyError.getDetailedMessage() });
      throw harmonyError;
    }
  }

  /**
   * Retrieves the list of devices from the hub.
   * Attempts to load from cache first, falls back to hub query if cache is invalid.
   * @returns Promise resolving to list of devices
   * @throws {HarmonyError} If retrieving devices fails or hub is not connected
   */
  public async getDevices(): Promise<HarmonyDevice[]> {
    if (!this.client || !this.isConnected) {
      throw new HarmonyError("Not connected to hub", ErrorCategory.STATE);
    }

    try {
      // Try to get from cache first
      const cached = await this.getCachedConfig();
      if (cached?.devices) {
        debug("Using cached devices for hub", { hubName: this.hub.name, deviceCount: cached.devices.length });
        return cached.devices;
      }

      debug("No cached devices found, fetching from hub");
      const devices = await this.getDevicesFromHub();

      // Cache the new devices
      await this.updateConfigCache(devices, await this.getActivitiesFromHub());

      return devices;
    } catch (err) {
      throw new HarmonyError(
        "Failed to get devices",
        ErrorCategory.HUB_COMMUNICATION,
        err instanceof Error ? err : undefined,
      );
    }
  }

  /**
   * Gets devices directly from the hub via WebSocket.
   * @returns Promise resolving to list of mapped HarmonyDevice objects
   * @throws {HarmonyError} If client not initialized or hub communication fails
   * @private
   */
  private async getDevicesFromHub(): Promise<HarmonyDevice[]> {
    if (!this.client) {
      throw new HarmonyError("Client not initialized", ErrorCategory.CONNECTION);
    }

    try {
      debug("Fetching devices from hub", { hubName: this.hub.name });
      const rawConfig = (await this.client.getAvailableCommands()) as RawConfig;

      if (!rawConfig.device || rawConfig.device.length === 0) {
        warn("No devices found in hub config");
        return [];
      }

      debug(`Found ${rawConfig.device.length} devices`);

      const mappedDevices = rawConfig.device.map((device) => {
        const mappedDevice = {
          id: device.id,
          name: device.label || device.id,
          type: device.type || "Unknown",
          commands: device.controlGroup.flatMap((group) =>
            group.function.map((fn) => ({
              id: fn.name,
              name: fn.name,
              label: fn.label || fn.name,
              deviceId: device.id,
              group: fn.action?.command || "IRCommand",
            })),
          ),
        } as HarmonyDevice;

        // Validate mapped device
        if (!isHarmonyDevice(mappedDevice)) {
          error("Invalid device mapping", { device, mappedDevice });
          throw new HarmonyError(`Invalid device mapping for ${device.id}`, ErrorCategory.VALIDATION);
        }

        return mappedDevice;
      });

      debug("Successfully mapped devices", {
        deviceCount: mappedDevices.length,
        commandCounts: mappedDevices.map((d) => ({
          deviceId: d.id,
          commandCount: d.commands.length,
        })),
      });

      return mappedDevices;
    } catch (err) {
      throw new HarmonyError(
        "Failed to get devices from hub",
        ErrorCategory.HUB_COMMUNICATION,
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  }

  /**
   * Retrieves the list of activities from the hub.
   * Attempts to load from cache first, falls back to hub query if cache is invalid.
   * @returns Promise resolving to list of activities
   * @throws {HarmonyError} If retrieving activities fails or hub is not connected
   */
  public async getActivities(): Promise<HarmonyActivity[]> {
    if (!this.client || !this.isConnected) {
      throw new HarmonyError("Not connected to hub", ErrorCategory.STATE);
    }

    try {
      // Try to get from cache first
      const cached = await this.getCachedConfig();
      if (cached?.activities) {
        debug("Using cached activities for hub", {
          hubName: this.hub.name,
          activityCount: cached.activities.length,
        });
        return cached.activities;
      }

      debug("No cached activities found, fetching from hub", { hubName: this.hub.name });
      const activities = await this.getActivitiesFromHub();

      // Cache the new activities along with current devices
      await this.updateConfigCache(await this.getDevices(), activities);

      return activities;
    } catch (err) {
      throw new HarmonyError(
        "Failed to get activities",
        ErrorCategory.HUB_COMMUNICATION,
        err instanceof Error ? err : undefined,
      );
    }
  }

  /**
   * Gets the currently running activity.
   * Queries the hub for current activity and matches it against known activities.
   * @returns Promise resolving to current activity or null if none
   * @throws {HarmonyError} If retrieving current activity fails or hub is not connected
   */
  public async getCurrentActivity(): Promise<HarmonyActivity | null> {
    if (!this.client || !this.isConnected) {
      throw new HarmonyError("Not connected to hub", ErrorCategory.STATE);
    }

    try {
      const rawActivity = await this.client.getCurrentActivity();
      debug("Got current activity from hub", { rawActivity });

      if (!rawActivity) {
        return null;
      }

      // Convert raw activity string to proper type
      const currentActivityId = String(rawActivity);

      // Get all activities to find the current one
      const activities = await this.getActivities();
      const activity = activities.find((a) => a.id === currentActivityId);

      if (!activity) {
        warn("Current activity not found in activity list", {
          currentActivityId,
          availableActivities: activities.map((a) => a.id),
        });
        return null;
      }

      const currentActivity = {
        ...activity,
        isCurrent: true,
      };

      // Validate current activity
      if (!isHarmonyActivity(currentActivity)) {
        error("Invalid current activity", { currentActivity });
        throw new HarmonyError("Invalid current activity data", ErrorCategory.VALIDATION);
      }

      return currentActivity;
    } catch (err) {
      throw new HarmonyError(
        "Failed to get current activity",
        ErrorCategory.HUB_COMMUNICATION,
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  }

  /**
   * Starts an activity by ID.
   * Initiates the activity and waits for confirmation of successful start.
   * @param activityId - ID of the activity to start
   * @throws {HarmonyError} If starting activity fails or hub is not connected
   */
  public async startActivity(activityId: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new HarmonyError("Not connected to hub", ErrorCategory.STATE);
    }

    try {
      debug("Starting activity", { activityId });

      await this.client.startActivity(activityId);

      // Wait for activity to start and verify
      const startTime = Date.now();
      const maxWaitTime = 10000; // 10 seconds max wait

      while (Date.now() - startTime < maxWaitTime) {
        const currentActivity = await this.getCurrentActivity();
        if (currentActivity?.id === activityId) {
          debug("Activity started successfully", { activityId });
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      throw new Error("Timeout waiting for activity to start");
    } catch (err) {
      throw new HarmonyError(
        `Failed to start activity ${activityId}`,
        ErrorCategory.COMMAND_EXECUTION,
        err instanceof Error ? err : undefined,
      );
    }
  }

  /**
   * Stops the current activity.
   * Sends stop command and waits for confirmation of successful stop.
   * @throws {HarmonyError} If stopping activity fails or hub is not connected
   */
  public async stopActivity(): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new HarmonyError("Not connected to hub", ErrorCategory.STATE);
    }

    try {
      debug("Stopping current activity");

      const currentActivity = await this.getCurrentActivity();
      if (!currentActivity) {
        debug("No activity running");
        return;
      }

      await this.client.turnOff();

      // Wait for activity to stop and verify
      const startTime = Date.now();
      const maxWaitTime = 10000; // 10 seconds max wait

      while (Date.now() - startTime < maxWaitTime) {
        const activity = await this.getCurrentActivity();
        if (!activity) {
          debug("Activity stopped successfully");
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      throw new Error("Timeout waiting for activity to stop");
    } catch (err) {
      throw new HarmonyError(
        "Failed to stop activity",
        ErrorCategory.COMMAND_EXECUTION,
        err instanceof Error ? err : undefined,
      );
    }
  }

  /**
   * Gets cached configuration if available.
   * Checks cache validity and expiration.
   * @returns Promise resolving to cached configuration or null
   * @throws {HarmonyError} If reading cache fails
   * @private
   */
  private async getCachedConfig(): Promise<CachedConfig | null> {
    try {
      const cached = await LocalStorage.getItem<string>(this.cacheKey);
      if (!cached) {
        debug("No cache found for hub", { hubName: this.hub.name });
        return null;
      }

      const config = JSON.parse(cached) as CachedConfig;

      // Validate cache has required data
      if (!config.devices?.length || !config.activities?.length) {
        debug("Cache invalid - missing data", {
          hubName: this.hub.name,
          hasDevices: !!config.devices?.length,
          hasActivities: !!config.activities?.length,
        });
        await LocalStorage.removeItem(this.cacheKey);
        return null;
      }

      // Check if cache is expired
      if (Date.now() - config.timestamp > CACHE_EXPIRY) {
        info("Config cache expired for hub", this.hub.name);
        await LocalStorage.removeItem(this.cacheKey);
        return null;
      }

      debug("Using valid cache for hub", {
        hubName: this.hub.name,
        deviceCount: config.devices.length,
        activityCount: config.activities.length,
        age: Math.round((Date.now() - config.timestamp) / 1000) + "s",
      });

      return config;
    } catch (err) {
      warn("Failed to get cached config:", err);
      return null;
    }
  }

  /**
   * Update the config cache with new devices and activities.
   * @param devices - List of devices to cache
   * @param activities - List of activities to cache
   * @private
   */
  private async updateConfigCache(devices: HarmonyDevice[], activities: HarmonyActivity[]): Promise<void> {
    try {
      // Validate we have data to cache
      if (!devices.length && !activities.length) {
        debug("Skipping cache update - no data to cache", { hubName: this.hub.name });
        return;
      }

      const cache: CachedConfig = {
        devices: devices.length ? devices : await this.getDevices(),
        activities: activities.length ? activities : await this.getActivitiesFromHub(),
        timestamp: Date.now(),
      };

      await LocalStorage.setItem(this.cacheKey, JSON.stringify(cache));
      debug("Updated cache for hub", {
        hubName: this.hub.name,
        deviceCount: cache.devices.length,
        activityCount: cache.activities.length,
      });
    } catch (err) {
      warn("Failed to cache config:", err);
    }
  }

  /**
   * Executes a command on a device.
   * Sends press and release actions with configurable hold time.
   * @param command - The command to execute
   * @throws {HarmonyError} If command execution fails or hub is not connected
   */
  public async executeCommand(command: HarmonyCommand): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new HarmonyError("Not connected to hub", ErrorCategory.STATE);
    }

    try {
      const preferences = getPreferenceValues<{ commandHoldTime: string }>();
      const holdTime = parseInt(preferences.commandHoldTime || "100", 10);

      debug("Sending command to hub", { command });

      const commandBody: HarmonyCommandBody = {
        command: command.id,
        deviceId: command.deviceId,
        type: command.group || "IRCommand",
      };

      debug("Command body:", commandBody);

      // Send press action
      await this.client.send("holdAction", commandBody);

      // Wait for hold time
      await new Promise((resolve) => setTimeout(resolve, holdTime));

      // Send release action
      await this.client.send("releaseAction", commandBody);
    } catch (err) {
      throw new HarmonyError(
        `Failed to execute command ${command.name}`,
        ErrorCategory.COMMAND_EXECUTION,
        err instanceof Error ? err : undefined,
      );
    }
  }

  /**
   * Disconnects from the Harmony Hub.
   * Cleans up resources and closes the connection.
   * @throws {HarmonyError} If disconnection fails
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.client && this.isConnected) {
        await this.client.end();
        this.isConnected = false;
        this.client = null;
        // Remove from active clients
        HarmonyClient.activeClients.delete(this.hub.hubId);
        debug(`Disconnected client for hub ${this.hub.name}`);
      }
    } catch (err) {
      throw new HarmonyError(
        "Failed to disconnect from hub",
        ErrorCategory.HUB_COMMUNICATION,
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  }

  /**
   * Type guard for raw activity data from hub
   * @param data - Data to check
   * @returns True if data matches RawActivity structure
   * @private
   */
  private isRawActivity(data: unknown): data is RawActivity {
    return (
      typeof data === "object" &&
      data !== null &&
      typeof (data as RawActivity).id === "string" &&
      typeof (data as RawActivity).label === "string" &&
      typeof (data as RawActivity).type === "string"
    );
  }

  /**
   * Maps raw activity data to HarmonyActivity format
   * @param raw - Raw activity data from hub
   * @returns Mapped HarmonyActivity
   * @private
   */
  private mapRawActivityToHarmonyActivity = (raw: RawActivity): HarmonyActivity => {
    const mappedActivity: HarmonyActivity = {
      id: String(raw.id),
      name: raw.label,
      type: raw.type,
      isCurrent: false,
    };

    if (!isHarmonyActivity(mappedActivity)) {
      error("Invalid activity mapping", { raw, mappedActivity });
      throw new HarmonyError(`Invalid activity mapping for ${raw.id}`, ErrorCategory.VALIDATION);
    }

    return mappedActivity;
  };

  private async getActivitiesFromHub(): Promise<HarmonyActivity[]> {
    if (!this.client) {
      throw new HarmonyError("Client not initialized", ErrorCategory.CONNECTION);
    }

    const response = await this.client.getActivities();
    const rawData = Array.isArray(response) ? response : [];

    // Convert raw data to activities
    const activities: HarmonyActivity[] = [];
    for (const item of rawData) {
      if (this.isRawActivity(item)) {
        activities.push(this.mapRawActivityToHarmonyActivity(item));
      } else {
        error("Invalid raw activity data:", item);
        continue;
      }
    }

    debug("Got activities from hub", {
      activityCount: activities.length,
      firstActivity: activities[0],
    });

    return activities;
  }

  /**
   * Clears cached configuration for this hub.
   * @throws {HarmonyError} If clearing cache fails
   */
  public async clearCache(): Promise<void> {
    try {
      info(`Clearing cache for hub ${this.hub.name}`);
      await LocalStorage.removeItem(this.cacheKey);
    } catch (err) {
      throw new HarmonyError("Failed to clear cache", ErrorCategory.CACHE, err instanceof Error ? err : undefined);
    }
  }
}
