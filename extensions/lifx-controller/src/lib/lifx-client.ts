import { getPreferenceValues } from "@raycast/api";
import { LIFXLanClient } from "./lifx-lan";
import { LIFXHttpClient } from "./lifx-http";
import { LIFXLight, LightControl, Preferences, ConnectionState } from "./types";

export class LIFXClientManager {
  private lanClient: LIFXLanClient | null = null;
  private httpClient: LIFXHttpClient | null = null;
  private connectionState: ConnectionState = {
    lanAvailable: false,
    httpAvailable: false,
    activeLights: [],
    lastDiscovery: null,
  };

  async initialize(): Promise<void> {
    const preferences = getPreferenceValues<Preferences>();

    // Try LAN discovery first (if enabled in preferences)
    if (preferences.enableLanDiscovery) {
      try {
        const timeout = parseInt(preferences.lanTimeout) || 5000;
        const stateTimeout = parseInt(preferences.lanStateTimeout) || 5000;
        const retryAttempts = parseInt(preferences.lanRetryAttempts) || 3;
        const cooldownPeriod = parseInt(preferences.lanCooldownPeriod) || 2000;

        this.lanClient = new LIFXLanClient({
          stateTimeout,
          retryAttempts,
          cooldownPeriod,
        });
        await this.lanClient.initialize(timeout);
        this.connectionState.lanAvailable = true;
      } catch (error) {
        console.warn("LAN discovery failed:", error);
        this.connectionState.lanAvailable = false;
      }
    }

    // Initialize HTTP client (requires API token)
    if (preferences.httpApiToken) {
      try {
        this.httpClient = new LIFXHttpClient();
        await this.httpClient.initialize(preferences.httpApiToken);
        this.connectionState.httpAvailable = true;
      } catch (error) {
        console.warn("HTTP API initialization failed:", error);
        this.connectionState.httpAvailable = false;
      }
    }

    if (!this.connectionState.lanAvailable && !this.connectionState.httpAvailable) {
      throw new Error("No connection method available. Enable LAN discovery or provide HTTP API token.");
    }
  }

  async discoverLights(): Promise<LIFXLight[]> {
    console.log(`[Client Manager] Starting light discovery...`);
    const lights: Map<string, LIFXLight> = new Map();

    // Prefer LAN lights (faster, local)
    if (this.lanClient && this.connectionState.lanAvailable) {
      try {
        const lanLights = await this.lanClient.getLights();
        lanLights.forEach((light) => lights.set(light.id, light));
        console.log(`[Client Manager] Found ${lanLights.length} LAN lights`);
      } catch (error) {
        console.warn("Failed to get LAN lights:", error);
      }
    }

    // Add HTTP lights not found via LAN
    if (this.httpClient && this.connectionState.httpAvailable) {
      try {
        const httpLights = await this.httpClient.getLights();
        httpLights.forEach((light) => {
          if (!lights.has(light.id)) {
            lights.set(light.id, light);
          }
        });
        console.log(`[Client Manager] Found ${httpLights.length} HTTP lights`);
      } catch (error) {
        console.warn("Failed to get HTTP lights:", error);
      }
    }

    this.connectionState.activeLights = Array.from(lights.values());
    this.connectionState.lastDiscovery = new Date();
    console.log(`[Client Manager] Total lights discovered: ${this.connectionState.activeLights.length}`);
    return this.connectionState.activeLights;
  }

  async getLightState(lightId: string): Promise<LIFXLight | null> {
    // Force fresh discovery to get current state
    await this.discoverLights();
    return this.connectionState.activeLights.find((l) => l.id === lightId) || null;
  }

  async controlLight(lightId: string, control: LightControl): Promise<void> {
    const light = this.connectionState.activeLights.find((l) => l.id === lightId);
    if (!light) throw new Error("Light not found");

    console.log(`[Client Manager] Controlling ${light.label} via ${light.source}:`, control);

    // Try preferred source first, fallback to alternative
    try {
      if (light.source === "lan" && this.lanClient) {
        await this.lanClient.control(lightId, control);
        console.log(`[Client Manager] Control succeeded via LAN`);
        return;
      } else if (this.httpClient) {
        await this.httpClient.control(lightId, control);
        console.log(`[Client Manager] Control succeeded via HTTP`);
        return;
      }
    } catch (error) {
      console.warn(`Primary control method failed for ${light.label}, trying fallback:`, error);

      // Fallback to alternative source
      if (light.source === "lan" && this.httpClient) {
        await this.httpClient.control(lightId, control);
        console.log(`[Client Manager] Control succeeded via HTTP (fallback)`);
      } else if (light.source === "http" && this.lanClient) {
        await this.lanClient.control(lightId, control);
        console.log(`[Client Manager] Control succeeded via LAN (fallback)`);
      } else {
        throw error;
      }
    }
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  destroy(): void {
    if (this.lanClient) {
      this.lanClient.destroy();
    }
  }
}
