import axios from "axios";
import { luxaforState } from "./luxafor-state";

export type LuxaforConfig = Pick<Preferences, "userId" | "apiEndpoint">;

export type LuxaforColor = "red" | "green" | "yellow" | "blue" | "white" | "cyan" | "magenta";

export type DeviceStatus = {
  isOnline: boolean;
  currentColor: string;
  lastSeen: Date | null;
  lastAction: string;
};

export type ApiResponse = {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
};

export class LuxaforService {
  private config: LuxaforConfig;
  private baseUrl: string;
  private isRefreshing: boolean = false;

  constructor(config: LuxaforConfig) {
    this.config = config;
    this.baseUrl = `https://api.luxafor.${config.apiEndpoint}/webhook/v1/actions`;
  }

  private async makeRequest(endpoint: string, actionFields: Record<string, string>): Promise<ApiResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${endpoint}`,
        {
          userId: this.config.userId,
          actionFields,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      return { success: true, data: response.data };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // Get current device status
  getCurrentStatus(): DeviceStatus {
    return luxaforState.getStatus();
  }

  // Get last action performed
  getLastAction(): string {
    return luxaforState.getStatus().lastAction;
  }

  // Get current color
  getCurrentColor(): string {
    return luxaforState.getStatus().currentColor;
  }

  // Turn device off (black color)
  async turnOff(): Promise<ApiResponse> {
    // Update global state first to ensure immediate UI feedback
    await luxaforState.setColor("off", "Turn Off");
    return this.makeRequest("solid_color", {
      color: "custom",
      custom_color: "000000",
    });
  }

  // Set solid color
  async setSolidColor(color: LuxaforColor): Promise<ApiResponse> {
    // Handle white as a custom hex color since the API doesn't support white natively
    if (color === "white") {
      await luxaforState.setColor("white", "Set white");
      return this.makeRequest("solid_color", {
        color: "custom",
        custom_color: "FFFFFF",
      });
    }

    await luxaforState.setColor(color, `Set ${color}`);

    return this.makeRequest("solid_color", {
      color,
    });
  }

  // Set custom hex color
  async setCustomColor(hexColor: string): Promise<ApiResponse> {
    // Ensure hex color is 6 characters and valid
    let cleanHex = hexColor.replace("#", "").toUpperCase();

    // Handle short hex colors (e.g., 'F' -> 'FF0000', '1A' -> '1A1A1A')
    if (cleanHex.length === 1) {
      cleanHex = cleanHex.repeat(6);
    } else if (cleanHex.length === 2) {
      cleanHex = cleanHex.repeat(3);
    } else if (cleanHex.length === 3) {
      cleanHex = cleanHex
        .split("")
        .map((char) => char + char)
        .join("");
    } else if (cleanHex.length < 6) {
      // For any other length less than 6, pad with the last character
      cleanHex = cleanHex.padEnd(6, cleanHex[cleanHex.length - 1]);
    } else {
      // If 6 or more characters, take the first 6
      cleanHex = cleanHex.substring(0, 6);
    }

    await luxaforState.setColor(cleanHex, `Set custom color ${cleanHex}`);

    return this.makeRequest("solid_color", {
      color: "custom",
      custom_color: cleanHex,
    });
  }

  // Blink with color
  async blink(color: LuxaforColor): Promise<ApiResponse> {
    // Store the current color before blinking
    const currentStatus = luxaforState.getStatus();
    const originalColor = currentStatus.currentColor;

    // Temporarily update state to show blink action
    await luxaforState.updateStatus({ lastAction: `Blink ${color}` });

    // Send blink command to device
    let result: ApiResponse;
    if (color === "white") {
      result = await this.makeRequest("blink", {
        color: "custom",
        custom_color: "FFFFFF",
      });
    } else {
      result = await this.makeRequest("blink", {
        color,
      });
    }

    // After a brief delay, restore the original color state
    // The device physically returns to original color, so state should match
    setTimeout(() => {
      if (originalColor && originalColor !== "off" && originalColor !== "unknown") {
        luxaforState.setColor(originalColor, `Restored after blink`).catch(() => {
          // Silently handle restoration errors
        });
      }
    }, 2000); // 2 second delay to allow blink to complete

    return result;
  }

  // Test connection by setting device to red color
  // This physically changes the device color to verify connectivity
  async testConnection(): Promise<ApiResponse> {
    await luxaforState.updateStatus({ lastAction: "Connection Test" });
    return this.makeRequest("solid_color", {
      color: "red",
    });
  }

  // Get device info (for status display) - only updates if not recently set by user
  async getDeviceInfo(): Promise<DeviceStatus> {
    try {
      // If we have a recent user action, don't overwrite it with API call
      const currentStatus = luxaforState.getStatus();
      if (currentStatus.lastAction && !this.isRefreshing) {
        return currentStatus;
      }

      // Only make API call if we're refreshing or don't have recent state
      this.isRefreshing = true;
      const result = await this.testConnection();
      this.isRefreshing = false;

      if (result.success) {
        // Only update color if we don't have a recent user action
        if (!currentStatus.lastAction || this.isRefreshing) {
          await luxaforState.setColor("red", "Connection Test");
        }
        await luxaforState.setOnline(true);
        return luxaforState.getStatus();
      } else {
        await luxaforState.setOnline(false);
        return luxaforState.getStatus();
      }
    } catch {
      this.isRefreshing = false;
      await luxaforState.setOnline(false);
      return luxaforState.getStatus();
    }
  }

  // Force refresh status (for manual refresh button)
  async forceRefreshStatus(): Promise<DeviceStatus> {
    this.isRefreshing = true;
    try {
      const result = await this.testConnection();
      if (result.success) {
        // Only update if we don't have recent user action
        const currentStatus = luxaforState.getStatus();
        if (!currentStatus.lastAction) {
          await luxaforState.setColor("red", "Connection Test");
        }
        await luxaforState.setOnline(true);
        return luxaforState.getStatus();
      } else {
        await luxaforState.setOnline(false);
        return luxaforState.getStatus();
      }
    } catch {
      await luxaforState.setOnline(false);
      return luxaforState.getStatus();
    } finally {
      this.isRefreshing = false;
    }
  }
}
