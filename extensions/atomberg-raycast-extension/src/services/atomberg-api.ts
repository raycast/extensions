import { LocalStorage, showToast, Toast } from "@raycast/api";
import {
  ATOMBERG_API_BASE_URL,
  ENDPOINTS,
  STORAGE_KEYS,
  TOKEN_EXPIRY_HOURS,
  TOKEN_REFRESH_BUFFER_MS,
} from "../constants";
import { logger } from "../utils/logger";
import type {
  AccessTokenResponse,
  AtombergApiResponse,
  Device,
  DeviceControlResponse,
  DeviceState,
  DeviceStateResponse,
  Preferences,
  DeviceCommand,
  CommandParameters,
} from "../types";

/**
 * Main service class for interacting with the Atomberg API
 *
 * This class provides comprehensive functionality for authenticating with the
 * Atomberg API, managing access tokens, controlling devices, and fetching
 * device states. It handles token lifecycle management, command payload
 * construction, and user feedback through toast notifications.
 *
 * @remarks
 * - Manages access token lifecycle with automatic refresh
 * - Provides comprehensive device control with parameter validation
 * - Includes user feedback through toast notifications
 * - Handles API errors gracefully with fallback strategies
 * - Supports both simple commands and parameterized operations
 */
export class AtombergApiService {
  /**
   * Creates a new AtombergApiService instance
   *
   * @param preferences - User preferences containing API credentials
   */
  constructor(private preferences: Preferences) {}

  /**
   * Fetches a new access token from the Atomberg API
   *
   * This method authenticates with the API using the refresh token and API key,
   * then stores the new access token in local storage with expiration tracking.
   *
   * @returns Promise resolving to the access token string or null if failed
   *
   * @throws Error when authentication fails or response format is invalid
   */
  async getAccessToken(): Promise<string | null> {
    try {
      const endpoint = `${ATOMBERG_API_BASE_URL}${ENDPOINTS.GET_ACCESS_TOKEN}`;
      logger.info("Attempting authentication with endpoint:", endpoint);
      logger.info("Using refresh token length:", this.preferences.refreshToken?.length || 0);
      logger.info("Using API key length:", this.preferences.apiKey?.length || 0);

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.preferences.refreshToken}`,
          "x-api-key": this.preferences.apiKey || "",
          "Content-Type": "application/json",
        },
      });

      logger.info("Auth response status:", response.status);
      logger.info("Auth response headers:", Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Auth error response:", errorText);
        throw new Error(`Authentication failed: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as AccessTokenResponse;
      logger.info("Access token response data:", data);

      if (data.status === "Success" && data.message?.access_token) {
        const expiryTime = Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;

        await LocalStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.message.access_token);
        await LocalStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());

        return data.message.access_token;
      } else {
        logger.error("Invalid response structure:", data);
        throw new Error("Invalid response format from API");
      }
    } catch (error) {
      logger.error("Error getting access token:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Authentication Error",
        message: "Failed to authenticate with Atomberg API. Please check your credentials.",
      });
      return null;
    }
  }

  /**
   * Gets a valid access token, either from cache or by fetching a new one
   *
   * This method implements intelligent token management by checking if a
   * cached token is still valid before making a new API request. It includes
   * a buffer time to ensure tokens are refreshed before they expire.
   *
   * @returns Promise resolving to a valid access token or null if failed
   *
   */
  async getValidAccessToken(): Promise<string | null> {
    try {
      const storedToken = await LocalStorage.getItem<string>(STORAGE_KEYS.ACCESS_TOKEN);
      const storedExpiry = await LocalStorage.getItem<string>(STORAGE_KEYS.TOKEN_EXPIRY);

      if (storedToken && storedExpiry) {
        const expiryTime = parseInt(storedExpiry, 10);
        const now = Date.now();

        if (now < expiryTime - TOKEN_REFRESH_BUFFER_MS) {
          return storedToken;
        }
      }

      return await this.getAccessToken();
    } catch (error) {
      logger.error("Error managing access token:", error);
      return await this.getAccessToken();
    }
  }

  /**
   * Fetches the list of Atomberg devices for the authenticated user
   *
   * This method authenticates with the API and retrieves all devices
   * associated with the user's account. It provides user feedback through
   * toast notifications during the process.
   *
   * @returns Promise resolving to array of devices or null if failed
   *
   * @throws Error when API request fails or response format is invalid
   *
   */
  async fetchDevices(): Promise<Device[] | null> {
    try {
      showToast({ title: "Authenticating", message: "Getting access token...", style: Toast.Style.Animated });

      const accessToken = await this.getValidAccessToken();
      if (!accessToken) {
        return null;
      }

      showToast({
        title: "Loading Devices...",
        message: "Fetching your Atomberg devices...",
        style: Toast.Style.Animated,
      });

      const response = await fetch(`${ATOMBERG_API_BASE_URL}${ENDPOINTS.GET_DEVICES}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-api-key": this.preferences.apiKey || "",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Device list API error:", response.status, errorText);
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as AtombergApiResponse;
      logger.info("Device list response:", JSON.stringify(data, null, 2));

      if (data.status !== "Success" || !data.message?.devices_list) {
        throw new Error("Failed to fetch devices - invalid response format");
      }

      const devices = data.message.devices_list;

      showToast({
        title: "Devices Loaded",
        message: `Found ${devices.length} devices`,
        style: Toast.Style.Success,
      });
      return devices;
    } catch (error) {
      logger.error("Error fetching devices:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Devices",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });

      return null;
    }
  }

  /**
   * Sends a control command to a specific device
   *
   * This method handles device control operations by building the appropriate
   * command payload and sending it to the API. It supports both simple commands
   * and parameterized operations with automatic payload construction.
   *
   * @param device - The device to control
   * @param command - The command to execute (string or DeviceCommand object)
   * @param deviceState - Optional current device state for state-dependent commands
   * @param parameters - Optional parameters for parameterized commands
   * @returns Promise resolving to boolean indicating success or failure
   *
   * @throws Error when command execution fails or payload construction fails
   */
  async controlDevice(
    device: Device,
    command: string | DeviceCommand,
    deviceState?: DeviceState,
    parameters?: CommandParameters,
  ): Promise<boolean> {
    try {
      const accessToken = await this.getValidAccessToken();
      if (!accessToken) {
        showToast({
          style: Toast.Style.Failure,
          title: "Authentication Error",
          message: "Unable to authenticate with Atomberg API",
        });
        return false;
      }

      const commandPayload = this.buildCommandPayload(command, device.device_id, deviceState, parameters);
      const commandDescription = this.getCommandDescription(commandPayload);

      logger.info("Command payload:", commandPayload);

      showToast({
        title: "Sending Command...",
        message: `Executing ${commandDescription} on ${device.name}`,
        style: Toast.Style.Animated,
      });

      const response = await fetch(`${ATOMBERG_API_BASE_URL}${ENDPOINTS.SEND_COMMAND}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-api-key": this.preferences.apiKey || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(commandPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Device control error:", response.status, errorText);
        throw new Error(`Command failed: ${response.status} - ${errorText}`);
      }

      const responseData = (await response.json()) as DeviceControlResponse;
      logger.info("Device control response:", responseData);

      showToast({
        title: this.getCommandTitle(commandPayload),
        message: this.getCommandMessage(commandPayload, device.name),
        style: Toast.Style.Success,
      });

      return true;
    } catch (error) {
      logger.error("Error controlling device:", error);

      // Provide more specific error messages based on error type
      let errorTitle = "Command Failed";
      let errorMessage = `Unable to control ${device.name}`;

      if (error instanceof Error) {
        if (error.message.includes("Device state required")) {
          errorTitle = "Device State Required";
          errorMessage = `${device.name} needs to be online to perform this action`;
        } else if (error.message.includes("parameter required")) {
          errorTitle = "Missing Parameter";
          errorMessage = `Required parameter missing for ${device.name}`;
        } else if (error.message.includes("Unknown command")) {
          errorTitle = "Unsupported Command";
          errorMessage = `This command is not supported by ${device.name}`;
        } else if (error.message.includes("Command failed:")) {
          errorTitle = "Network Error";
          errorMessage = `Failed to communicate with ${device.name}`;
        }
      }

      showToast({
        style: Toast.Style.Failure,
        title: errorTitle,
        message: errorMessage,
      });
      return false;
    }
  }

  /**
   * Builds the command payload for API requests
   *
   * This private method constructs the appropriate payload structure for
   * different types of commands. It handles both simple commands and
   * parameterized operations with validation.
   *
   * @param command - The command to execute
   * @param deviceId - The ID of the target device
   * @param deviceState - Optional current device state for state-dependent commands
   * @param parameters - Optional parameters for parameterized commands
   * @returns Properly formatted command payload for the API
   *
   * @throws Error when required parameters are missing or command is unknown
   *
   * @private
   */
  private buildCommandPayload(
    command: string | DeviceCommand,
    deviceId: string,
    deviceState?: DeviceState,
    parameters?: CommandParameters,
  ): { device_id: string; command: Record<string, string | number | boolean> } {
    const basePayload = { device_id: deviceId };

    if (typeof command === "string") {
      switch (command) {
        case "toggle":
          if (!deviceState) throw new Error("Device state required for toggle command");
          return { ...basePayload, command: { power: !deviceState.power } };
        case "speed_up":
          return { ...basePayload, command: { speedDelta: 1 } };
        case "speed_down":
          return { ...basePayload, command: { speedDelta: -1 } };
        // Note: oscillation_toggle command does not exist in API documentation - removed
        case "sleep_mode":
          if (!deviceState) throw new Error("Device state required for sleep mode toggle");
          return { ...basePayload, command: { sleep: !deviceState.sleep_mode } };
        case "led_toggle":
          if (!deviceState) throw new Error("Device state required for LED toggle");
          return { ...basePayload, command: { led: !deviceState.led } };
        case "timer_1h":
          return { ...basePayload, command: { timer: 1 } };
        case "timer_2h":
          return { ...basePayload, command: { timer: 2 } };
        case "timer_3h":
          return { ...basePayload, command: { timer: 3 } };
        case "timer_6h":
          return { ...basePayload, command: { timer: 4 } };
        case "timer_off":
          return { ...basePayload, command: { timer: 0 } };
        case "brightness_up":
          return { ...basePayload, command: { brightnessDelta: 10 } };
        case "brightness_down":
          return { ...basePayload, command: { brightnessDelta: -10 } };
        case "set_speed":
          if (!parameters?.speed_level) throw new Error("Speed level parameter required for set_speed command");
          return { ...basePayload, command: { speed: parameters.speed_level } };
        case "set_timer":
          if (!parameters?.timer_hours) throw new Error("Timer hours parameter required for set_timer command");
          return { ...basePayload, command: { timer: parameters.timer_hours } };
        case "set_brightness":
          if (!parameters?.brightness_level)
            throw new Error("Brightness level parameter required for set_brightness command");
          return { ...basePayload, command: { brightness: parameters.brightness_level } };
        case "set_brightness_delta":
          if (!parameters?.brightness_delta)
            throw new Error("Brightness delta parameter required for set_brightness_delta command");
          return { ...basePayload, command: { brightnessDelta: parameters.brightness_delta } };
        case "set_color":
          if (!parameters?.color) throw new Error("Color parameter required for set_color command");
          return { ...basePayload, command: { light_mode: parameters.color } };
        default:
          throw new Error(`Unknown simple command: ${command}`);
      }
    }

    switch (command.command) {
      case "set_speed":
        return {
          ...basePayload,
          command: { speed: command.speed_level },
        };
      case "set_timer":
        return {
          ...basePayload,
          command: { timer: command.timer_hours },
        };
      case "set_brightness":
        return {
          ...basePayload,
          command: { brightness: command.brightness_level },
        };
      case "set_brightness_delta":
        return {
          ...basePayload,
          command: { brightnessDelta: command.brightness_delta },
        };
      case "set_color":
        return {
          ...basePayload,
          command: { light_mode: command.color },
        };
      default:
        throw new Error(`Unknown parametrized command: ${command.command}`);
    }
  }

  /**
   * Generates a human-readable description of a command payload
   *
   * This private method converts the technical command payload into
   * user-friendly descriptions for toast notifications and logging.
   *
   * @param payload - The command payload to describe
   * @returns Human-readable description of the command
   *
   * @private
   */
  private getCommandDescription(payload: {
    device_id: string;
    command: Record<string, string | number | boolean>;
  }): string {
    const cmd = payload.command;

    if ("power" in cmd) return "power toggle";
    if ("speedDelta" in cmd) {
      const delta = cmd.speedDelta as number;
      return delta > 0 ? "speed increase" : "speed decrease";
    }
    if ("speed" in cmd) return `speed level ${cmd.speed}`;
    if ("sleep" in cmd) return "sleep mode toggle";
    if ("led" in cmd) return "LED toggle";
    if ("timer" in cmd) {
      const hours = cmd.timer as number;
      return hours === 0 ? "timer cancellation" : `${hours} hour timer`;
    }
    if ("brightness" in cmd) return `brightness level ${cmd.brightness}`;
    if ("brightnessDelta" in cmd) {
      const delta = cmd.brightnessDelta as number;
      return delta > 0 ? "brightness increase" : "brightness decrease";
    }
    if ("light_mode" in cmd) return `color ${cmd.light_mode}`;

    return "command";
  }

  /**
   * Generates a user-friendly title for a command payload
   *
   * This private method creates specific, contextual titles for different
   * command types to make toast notifications more informative.
   *
   * @param payload - The command payload to generate title for
   * @returns User-friendly title for the command
   *
   * @private
   */
  private getCommandTitle(payload: { device_id: string; command: Record<string, string | number | boolean> }): string {
    const cmd = payload.command;

    if ("power" in cmd) {
      const isPowerOn = cmd.power as boolean;
      return isPowerOn ? "Fan Turned On" : "Fan Turned Off";
    }
    if ("speedDelta" in cmd) {
      const delta = cmd.speedDelta as number;
      return delta > 0 ? "Speed Increased" : "Speed Decreased";
    }
    if ("speed" in cmd) return "Speed Set";
    if ("sleep" in cmd) {
      const isSleepMode = cmd.sleep as boolean;
      return isSleepMode ? "Sleep Mode Enabled" : "Sleep Mode Disabled";
    }
    if ("led" in cmd) {
      const isLedOn = cmd.led as boolean;
      return isLedOn ? "LED Light Turned On" : "LED Light Turned Off";
    }
    if ("timer" in cmd) {
      const hours = cmd.timer as number;
      return hours === 0 ? "Timer Cancelled" : "Timer Set";
    }
    if ("brightness" in cmd) return "Brightness Set";
    if ("brightnessDelta" in cmd) {
      const delta = cmd.brightnessDelta as number;
      return delta > 0 ? "Brightness Increased" : "Brightness Decreased";
    }
    if ("light_mode" in cmd) return "Color Changed";

    return "Command Executed";
  }

  /**
   * Generates a user-friendly message for a command payload
   *
   * This private method creates specific, contextual messages for different
   * command types to provide clear feedback about what was accomplished.
   *
   * @param payload - The command payload to generate message for
   * @param deviceName - The name of the device being controlled
   * @returns User-friendly message for the command
   *
   * @private
   */
  private getCommandMessage(
    payload: {
      device_id: string;
      command: Record<string, string | number | boolean>;
    },
    deviceName: string,
  ): string {
    const cmd = payload.command;

    if ("power" in cmd) {
      const isPowerOn = cmd.power as boolean;
      return isPowerOn ? `${deviceName} is now running` : `${deviceName} has been turned off`;
    }
    if ("speedDelta" in cmd) {
      const delta = cmd.speedDelta as number;
      return delta > 0 ? `${deviceName} speed increased by 1 level` : `${deviceName} speed decreased by 1 level`;
    }
    if ("speed" in cmd) {
      const speed = cmd.speed as number;
      return `${deviceName} speed set to level ${speed}`;
    }
    if ("sleep" in cmd) {
      const isSleepMode = cmd.sleep as boolean;
      return isSleepMode ? `${deviceName} sleep mode activated` : `${deviceName} sleep mode deactivated`;
    }
    if ("led" in cmd) {
      const isLedOn = cmd.led as boolean;
      return isLedOn ? `${deviceName} LED light is now on` : `${deviceName} LED light is now off`;
    }
    if ("timer" in cmd) {
      const hours = cmd.timer as number;
      return hours === 0
        ? `${deviceName} timer has been cancelled`
        : `${deviceName} timer set for ${hours} hour${hours > 1 ? "s" : ""}`;
    }
    if ("brightness" in cmd) {
      const brightness = cmd.brightness as number;
      return `${deviceName} brightness set to ${brightness}%`;
    }
    if ("brightnessDelta" in cmd) {
      const delta = cmd.brightnessDelta as number;
      return delta > 0
        ? `${deviceName} brightness increased by ${Math.abs(delta)}%`
        : `${deviceName} brightness decreased by ${Math.abs(delta)}%`;
    }
    if ("light_mode" in cmd) {
      const color = cmd.light_mode as string;
      return `${deviceName} color changed to ${color}`;
    }

    return `Command sent to ${deviceName}`;
  }

  /**
   * Fetches the current state of a specific device
   *
   * This method retrieves the real-time state information for a device,
   * including power status, speed, sleep mode, LED state, and other
   * device-specific properties.
   *
   * @param deviceId - The unique identifier of the device
   * @returns Promise resolving to device state object or null if failed
   *
   * @throws Error when API request fails or response format is invalid
   */
  async fetchDeviceState(deviceId: string): Promise<DeviceState | null> {
    try {
      const accessToken = await this.getValidAccessToken();
      if (!accessToken) {
        return null;
      }

      const response = await fetch(`${ATOMBERG_API_BASE_URL}${ENDPOINTS.GET_DEVICE_STATE}?device_id=${deviceId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-api-key": this.preferences.apiKey || "",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Device state API error:", response.status, errorText);
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as DeviceStateResponse;
      logger.info("Device state response:", JSON.stringify(data, null, 2));

      if (data.status !== "Success" || !data.message?.device_state) {
        throw new Error("Failed to fetch device state - invalid response format");
      }

      return data.message.device_state?.[0] || null;
    } catch (error) {
      logger.error("Error fetching device state:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Device State",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });

      return null;
    }
  }
}
