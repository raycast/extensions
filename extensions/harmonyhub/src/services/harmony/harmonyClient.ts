import getHarmonyClient from "@harmonyhub/client-ws";
import { LocalStorage, getPreferenceValues } from "@raycast/api";

import { ErrorCategory, HarmonyError } from "../../types/errors";
import { HarmonyHub, HarmonyDevice, HarmonyActivity, HarmonyCommand } from "../../types/harmony";
import { Logger } from "../logger";

// Cache constants
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

interface CachedConfig {
  devices: HarmonyDevice[];
  activities: HarmonyActivity[];
  timestamp: number;
}

interface HarmonyHubConfig {
  device: Array<{
    id: string;
    name: string;
    type: string;
    commands: Array<{
      name: string;
      label?: string;
      action?: {
        command?: {
          type?: string;
        };
      };
    }>;
  }>;
}

interface HarmonyHubActivity {
  id: string;
  label: string;
  type: string;
}

interface HarmonyCommandBody {
  command: string;
  deviceId: string;
  type: string;
}

interface CommandFunction {
  name: string;
  label?: string;
  action?: {
    command?: {
      type?: string;
    };
  };
}

interface CommandGroup {
  name: string;
  function?: CommandFunction[];
}

interface ControlPort {
  commandGroup?: CommandGroup[];
}

interface RawDevice {
  id?: string;
  name?: string;
  label?: string;
  type?: string;
  controlPort?: ControlPort;
}

interface RawConfig {
  device?: RawDevice[];
}

export class HarmonyClient {
  private client: Awaited<ReturnType<typeof getHarmonyClient>> | null = null;
  private isConnected = false;
  public readonly hub: HarmonyHub;
  private cacheKey: string;

  constructor(hub: HarmonyHub) {
    this.hub = hub;
    this.cacheKey = `harmony-config-${hub.hubId}`;
  }

  /**
   * Connect to the Harmony Hub
   */
  public async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      Logger.info(`Connecting to hub ${this.hub.name} (${this.hub.ip})`);

      // Create client with remoteId if available for faster connection
      this.client = await getHarmonyClient(this.hub.ip);
      this.isConnected = true;

      Logger.info(`Connected to hub ${this.hub.name}`);

      // Setup disconnect handler
      this.client?.on("disconnected", () => {
        Logger.warn(`Disconnected from hub ${this.hub.name}`);
        this.isConnected = false;
      });
    } catch (err) {
      this.isConnected = false;
      throw new HarmonyError(
        `Failed to connect to hub ${this.hub.name}`,
        ErrorCategory.CONNECTION,
        err instanceof Error ? err : undefined,
      );
    }
  }

  /**
   * Get devices from the hub
   */
  public async getDevices(): Promise<HarmonyDevice[]> {
    if (!this.client || !this.isConnected) {
      throw new HarmonyError("Not connected to hub", ErrorCategory.STATE);
    }

    try {
      // Try to get from cache first
      const cached = await this.getCachedConfig();
      if (cached?.devices) {
        Logger.info("Using cached devices for hub", this.hub.name);
        return cached.devices;
      }

      // Get from hub if not cached
      const devices = await this.getDevicesFromHub();
      const mappedDevices = devices.map((device) => ({
        id: device.id,
        name: device.name,
        type: device.type,
        commands: device.commands.map((func) => ({
          id: func.name,
          name: func.name,
          label: func.label,
          deviceId: device.id,
          group: func.action?.command?.type || "IRCommand",
        })),
      })) as HarmonyDevice[];

      // Cache the new devices along with current activities
      await this.updateConfigCache(mappedDevices, await this.getActivitiesFromHub());

      return mappedDevices;
    } catch (err) {
      throw new HarmonyError(
        "Failed to get devices",
        ErrorCategory.HUB_COMMUNICATION,
        err instanceof Error ? err : undefined,
      );
    }
  }

  private async getDevicesFromHub(): Promise<HarmonyHubConfig["device"]> {
    if (!this.client) {
      throw new HarmonyError("Client not initialized", ErrorCategory.CONNECTION);
    }

    try {
      const rawConfig = (await this.client.getAvailableCommands()) as RawConfig;
      const devices =
        rawConfig.device?.map((d: RawDevice) => ({
          id: d.id || "",
          name: d.label || d.name || "",
          type: d.type || "",
          commands: (d.controlPort?.commandGroup || []).flatMap((group: CommandGroup) =>
            (group.function || []).map((fn: CommandFunction) => ({
              id: fn.name,
              name: fn.name,
              label: fn.label || fn.name,
              action: fn.action,
            })),
          ),
        })) || [];

      return devices;
    } catch (err) {
      throw new HarmonyError(
        "Failed to get devices from hub",
        ErrorCategory.HUB_COMMUNICATION,
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  }

  /**
   * Get activities from the hub
   */
  public async getActivities(): Promise<HarmonyActivity[]> {
    if (!this.client || !this.isConnected) {
      throw new HarmonyError("Not connected to hub", ErrorCategory.STATE);
    }

    try {
      // Try to get from cache first
      const cached = await this.getCachedConfig();
      if (cached?.activities) {
        Logger.info("Using cached activities for hub", this.hub.name);
        return cached.activities;
      }

      // Get from hub if not cached
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
   * Get activities directly from hub
   */
  private async getActivitiesFromHub(): Promise<HarmonyActivity[]> {
    if (!this.client) {
      throw new HarmonyError("Client not initialized", ErrorCategory.CONNECTION);
    }
    const activities = (await this.client.getActivities()) as HarmonyHubActivity[];
    return activities.map((activity) => ({
      id: activity.id,
      name: activity.label,
      type: activity.type,
      isCurrent: false, // Will be updated by current activity check
    }));
  }

  /**
   * Get current activity from hub
   */
  public async getCurrentActivity(): Promise<HarmonyActivity | null> {
    if (!this.client || !this.isConnected) {
      throw new HarmonyError("Not connected to hub", ErrorCategory.STATE);
    }

    try {
      const rawActivity = await this.client.getCurrentActivity();
      if (!rawActivity) {
        return null;
      }

      // Convert raw activity string to proper type
      const currentActivityId = String(rawActivity);

      // Get all activities to find the current one
      const activities = await this.getActivities();
      const activity = activities.find((a) => a.id === currentActivityId);

      if (!activity) {
        return null;
      }

      return {
        ...activity,
        isCurrent: true,
      };
    } catch (err) {
      throw new HarmonyError(
        "Failed to get current activity",
        ErrorCategory.HUB_COMMUNICATION,
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  }

  /**
   * Start an activity
   */
  public async startActivity(activityId: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new HarmonyError("Not connected to hub", ErrorCategory.STATE);
    }

    try {
      Logger.debug("Starting activity", { activityId });

      await this.client.startActivity(activityId);

      // Wait for activity to start and verify
      const startTime = Date.now();
      const maxWaitTime = 10000; // 10 seconds max wait

      while (Date.now() - startTime < maxWaitTime) {
        const currentActivity = await this.getCurrentActivity();
        if (currentActivity?.id === activityId) {
          Logger.debug("Activity started successfully", { activityId });
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
   * Stop the current activity
   */
  public async stopActivity(): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new HarmonyError("Not connected to hub", ErrorCategory.STATE);
    }

    try {
      Logger.debug("Stopping current activity");

      const currentActivity = await this.getCurrentActivity();
      if (!currentActivity) {
        Logger.debug("No activity running");
        return;
      }

      await this.client.turnOff();

      // Wait for activity to stop and verify
      const startTime = Date.now();
      const maxWaitTime = 10000; // 10 seconds max wait

      while (Date.now() - startTime < maxWaitTime) {
        const activity = await this.getCurrentActivity();
        if (!activity) {
          Logger.debug("Activity stopped successfully");
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
   * Get cached config if available and not expired
   */
  private async getCachedConfig(): Promise<CachedConfig | null> {
    try {
      const cached = await LocalStorage.getItem<string>(this.cacheKey);
      if (!cached) {
        return null;
      }

      const config = JSON.parse(cached) as CachedConfig;

      // Check if cache is expired
      if (Date.now() - config.timestamp > CACHE_EXPIRY) {
        Logger.info("Config cache expired for hub", this.hub.name);
        await LocalStorage.removeItem(this.cacheKey);
        return null;
      }

      return config;
    } catch (err) {
      Logger.warn("Failed to get cached config:", err);
      return null;
    }
  }

  /**
   * Update the config cache with new devices and activities
   */
  private async updateConfigCache(devices: HarmonyDevice[], activities: HarmonyActivity[]): Promise<void> {
    try {
      const cache: CachedConfig = {
        devices,
        activities,
        timestamp: Date.now(),
      };
      await LocalStorage.setItem(this.cacheKey, JSON.stringify(cache));
      Logger.info("Cached config for hub", this.hub.name);
    } catch (err) {
      Logger.warn("Failed to cache config:", err);
    }
  }

  /**
   * Execute a command
   */
  public async executeCommand(command: HarmonyCommand): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new HarmonyError("Not connected to hub", ErrorCategory.STATE);
    }

    try {
      const preferences = getPreferenceValues<{ commandHoldTime: string }>();
      const holdTime = parseInt(preferences.commandHoldTime || "100", 10);

      Logger.debug("Sending command to hub", { command });

      const commandBody: HarmonyCommandBody = {
        command: command.id,
        deviceId: command.deviceId,
        type: command.group || "IRCommand",
      };

      Logger.debug("Command body:", commandBody);

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
   * Disconnect from the hub
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.client && this.isConnected) {
        await this.client.end();
        this.isConnected = false;
        this.client = null;
      }
    } catch (err) {
      throw new HarmonyError(
        "Failed to disconnect from hub",
        ErrorCategory.HUB_COMMUNICATION,
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  }
}
