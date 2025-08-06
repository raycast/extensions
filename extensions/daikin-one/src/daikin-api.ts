import { showHUD, showToast, Toast, getPreferenceValues } from "@raycast/api";

interface DaikinToken {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
}

interface DaikinDeviceData {
  equipmentStatus: number;
  tempIndoor: number;
  tempOutdoor: number;
  mode: number;
  hspActive: number;
  cspActive: number;
  humIndoor: number;
  humOutdoor: number;
  humSP: number;
  oneCleanFanActive: boolean;
  fanCirculate: number;
  fanCirculateSpeed: number;
  units: number;
  schedOverride: number;
  schedEnabled: boolean;
  geofencingAway: boolean;
}

interface DaikinDevice {
  id: string;
  name: string;
  model: string;
  status: string;
  data?: DaikinDeviceData;
}

// Target heating/cooling states based on homebridge plugin
export const enum TargetHeatingCoolingState {
  OFF = 0,
  HEAT = 1,
  COOL = 2,
  AUTO = 3,
  AUXILIARY_HEAT = 4,
}

export const TargetHeatingCoolingStateNames = {
  [TargetHeatingCoolingState.OFF]: "OFF",
  [TargetHeatingCoolingState.HEAT]: "HEAT",
  [TargetHeatingCoolingState.COOL]: "COOL",
  [TargetHeatingCoolingState.AUTO]: "AUTO",
  [TargetHeatingCoolingState.AUXILIARY_HEAT]: "AUXILIARY_HEAT",
};

class DaikinOneAPI {
  private baseUrl = "https://api.daikinskyport.com";
  private token: DaikinToken | null = null;
  private tokenExpiration: Date | null = null;

  async authenticate(email: string, password: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/users/auth/login`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!response.ok) {
        throw new Error("Authentication failed");
      }

      const data = (await response.json()) as DaikinToken;
      this.token = data;
      this.tokenExpiration = new Date();

      // Set expiration a little early (like the homebridge code)
      const expSeconds = this.tokenExpiration.getSeconds() + this.token.accessTokenExpiresIn - 180 * 2; // 180 seconds = 3 minutes early

      this.tokenExpiration.setSeconds(expSeconds);
      return true;
    } catch (error) {
      console.error("Authentication error:", error);
      return false;
    }
  }

  async getDevices(): Promise<DaikinDevice[]> {
    if (!this.token) {
      throw new Error("Not authenticated");
    }

    try {
      const response = await fetch(`${this.baseUrl}/devices`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.token.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch devices");
      }

      const data = (await response.json()) as DaikinDevice[];
      return data;
    } catch (error) {
      console.error("Error fetching devices:", error);
      throw error;
    }
  }

  async getDeviceData(deviceId: string): Promise<DaikinDeviceData | null> {
    if (!this.token) {
      throw new Error("Not authenticated");
    }

    try {
      const response = await fetch(`${this.baseUrl}/deviceData/${deviceId}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.token.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch device data");
      }

      const data = (await response.json()) as DaikinDeviceData;
      return data;
    } catch (error) {
      console.error("Error fetching device data:", error);
      throw error;
    }
  }

  async setTargetState(deviceId: string, requestedState: number): Promise<boolean> {
    if (!this.token) {
      throw new Error("Not authenticated");
    }

    try {
      const response = await fetch(`${this.baseUrl}/deviceData/${deviceId}`, {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token.accessToken}`,
        },
        body: JSON.stringify({
          mode: requestedState,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to set target state");
      }

      return true;
    } catch (error) {
      console.error("Error setting target state:", error);
      return false;
    }
  }

  async setTargetTemps(
    deviceId: string,
    targetTemp?: number,
    heatThreshold?: number,
    coolThreshold?: number,
  ): Promise<boolean> {
    if (!this.token) {
      throw new Error("Not authenticated");
    }

    try {
      const requestedData: Record<string, number> = {};

      if (targetTemp !== undefined) {
        // Get current device data to determine which temperature to set
        const deviceData = await this.getDeviceData(deviceId);
        if (deviceData) {
          switch (deviceData.mode) {
            case TargetHeatingCoolingState.HEAT:
            case TargetHeatingCoolingState.AUXILIARY_HEAT:
              requestedData.hspHome = targetTemp;
              break;
            case TargetHeatingCoolingState.COOL:
              requestedData.cspHome = targetTemp;
              break;
            case TargetHeatingCoolingState.AUTO:
              if (heatThreshold !== undefined && coolThreshold !== undefined) {
                requestedData.hspHome = heatThreshold;
                requestedData.cspHome = coolThreshold;
              }
              break;
          }
        }
      }

      if (Object.keys(requestedData).length === 0) {
        return true; // Nothing to update
      }

      const response = await fetch(`${this.baseUrl}/deviceData/${deviceId}`, {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token.accessToken}`,
        },
        body: JSON.stringify(requestedData),
      });

      if (!response.ok) {
        throw new Error("Failed to set temperature");
      }

      return true;
    } catch (error) {
      console.error("Error setting temperature:", error);
      return false;
    }
  }

  async loadCredentials(): Promise<boolean> {
    try {
      const preferences = getPreferenceValues<{
        daikinEmail: string;
        daikinPassword: string;
      }>();

      if (preferences.daikinEmail && preferences.daikinPassword) {
        return await this.authenticate(preferences.daikinEmail, preferences.daikinPassword);
      }
      return false;
    } catch (error) {
      console.error("Error loading credentials:", error);
      return false;
    }
  }

  isAuthenticated(): boolean {
    return this.token !== null;
  }

  async getFirstDevice(): Promise<DaikinDevice | null> {
    const devices = await this.getDevices();
    return devices.length > 0 ? devices[0] : null;
  }
}

// Global API instance
export const daikinAPI = new DaikinOneAPI();

// Helper functions for common operations
export async function setTargetState(state: TargetHeatingCoolingState): Promise<void> {
  try {
    if (!daikinAPI.isAuthenticated()) {
      const authenticated = await daikinAPI.loadCredentials();
      if (!authenticated) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Not authenticated",
          message: "Please set up your Daikin One credentials first",
        });
        return;
      }
    }

    const device = await daikinAPI.getFirstDevice();
    if (!device) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No devices found",
        message: "Please check your Daikin One account",
      });
      return;
    }

    // Turn on by setting to auto mode (which turns on the system)
    const success = await daikinAPI.setTargetState(device.id, state);
    if (success) {
      await showHUD(`Thermostat turned ${TargetHeatingCoolingStateNames[state]}`);
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to set thermostat to ${TargetHeatingCoolingStateNames[state]}`,
        message: "Please try again",
      });
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Failed to set thermostat to ${TargetHeatingCoolingStateNames[state]}`,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
