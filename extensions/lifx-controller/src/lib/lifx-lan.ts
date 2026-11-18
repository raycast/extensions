import { Client } from "lifx-lan-client";
import { LIFXLight, LightControl } from "./types";

interface LifxLanLightState {
  label: string;
  power: number;
  color: {
    hue: number;
    saturation: number;
    brightness: number;
    kelvin: number;
  };
}

interface LifxLanLight {
  id: string;
  address: string;
  port: number;
  on: (duration: number, callback?: () => void) => void;
  off: (duration: number, callback?: () => void) => void;
  color: (
    hue: number,
    saturation: number,
    brightness: number,
    kelvin: number,
    duration: number,
    callback?: () => void,
  ) => void;
  getState: (callback: (error: Error | null, state: LifxLanLightState | null) => void) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LifxLanClientType = any;

export class LIFXLanClient {
  private client: LifxLanClientType;
  private lights: Map<string, LifxLanLight>;
  private lastControlTime: Map<string, number> = new Map();
  private cachedStates: Map<string, LIFXLight> = new Map();
  private consecutiveFailures: Map<string, number> = new Map();

  // Configurable settings with defaults
  private stateTimeout = 5000;
  private retryAttempts = 3;
  private cooldownPeriod = 2000;

  constructor(options?: { stateTimeout?: number; retryAttempts?: number; cooldownPeriod?: number }) {
    this.client = new Client();
    this.lights = new Map();

    if (options) {
      if (options.stateTimeout) this.stateTimeout = options.stateTimeout;
      if (options.retryAttempts) this.retryAttempts = options.retryAttempts;
      if (options.cooldownPeriod) this.cooldownPeriod = options.cooldownPeriod;
    }
  }

  async initialize(timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.lights.size === 0) {
          reject(new Error("No lights discovered via LAN"));
        } else {
          resolve();
        }
      }, timeout);

      this.client.on("light-new", (light: LifxLanLight) => {
        this.lights.set(light.id, light);
        if (timer && this.lights.size === 1) {
          clearTimeout(timer);
          resolve();
        }
      });

      this.client.init();
    });
  }

  /**
   * Helper to wait for specified milliseconds
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Retry getState with exponential backoff
   */
  private async getStateWithRetry(id: string, lanLight: LifxLanLight): Promise<LifxLanLightState | null> {
    const maxRetries = this.retryAttempts;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const timeout = this.stateTimeout * Math.pow(1.5, attempt); // Exponential backoff

      const state = await new Promise<LifxLanLightState | null>((resolve) => {
        const timer = setTimeout(() => {
          if (attempt === maxRetries - 1) {
            console.warn(
              `[LAN Discovery] getState timeout for light ${id.substring(0, 8)} (attempt ${attempt + 1}/${maxRetries})`,
            );
          }
          resolve(null);
        }, timeout);

        lanLight.getState((err, data) => {
          clearTimeout(timer);
          resolve(err ? null : data);
        });
      });

      if (state) {
        // Success - reset failure counter
        this.consecutiveFailures.set(id, 0);
        return state;
      }

      // Wait before retry (except on last attempt)
      if (attempt < maxRetries - 1) {
        await this.sleep(500 * (attempt + 1)); // Progressive delay
      }
    }

    // All retries failed
    const failures = (this.consecutiveFailures.get(id) || 0) + 1;
    this.consecutiveFailures.set(id, failures);
    return null;
  }

  async getLights(): Promise<LIFXLight[]> {
    const lights: LIFXLight[] = [];
    console.log(`[LAN Discovery] Querying ${this.lights.size} lights for state...`);

    for (const [id, lanLight] of this.lights) {
      // Cooldown: Wait if light was recently controlled
      const lastControl = this.lastControlTime.get(id);
      if (lastControl) {
        const timeSinceControl = Date.now() - lastControl;

        if (timeSinceControl < this.cooldownPeriod) {
          const waitTime = this.cooldownPeriod - timeSinceControl;
          console.log(`[LAN Discovery] Waiting ${waitTime}ms for light ${id.substring(0, 8)} to settle after control`);
          await this.sleep(waitTime);
        }
      }

      // Try to get state with retry logic
      const state = await this.getStateWithRetry(id, lanLight);

      if (state) {
        console.log(`[LAN Discovery] Raw state from bulb:`, state.color);

        // IMPORTANT: The lifx-lan-client library handles ALL conversions for us!
        // When READING (getState): ALL values are already in human-readable ranges (hue 0-360, sat/bri 0-100)
        // When WRITING (color): ALL values should be in human-readable ranges (hue 0-360, sat/bri 0-100)
        const lightData: LIFXLight = {
          id,
          label: state.label || `Light ${id.substring(0, 8)}`,
          power: state.power === 1,
          brightness: Math.round(state.color.brightness), // Already 0-100
          hue: Math.round(state.color.hue), // Already 0-360
          saturation: Math.round(state.color.saturation), // Already 0-100
          kelvin: state.color.kelvin,
          connected: true,
          source: "lan",
          reachable: true,
        };

        // Cache the successful state
        this.cachedStates.set(id, lightData);

        console.log(
          `[LAN Discovery] ${lightData.label}: Power:${lightData.power} H:${lightData.hue}° S:${lightData.saturation}% B:${lightData.brightness}% K:${lightData.kelvin}K`,
        );
        lights.push(lightData);
      } else {
        // Graceful degradation: Use cached state if available
        const failures = this.consecutiveFailures.get(id) || 0;
        const cachedState = this.cachedStates.get(id);

        if (cachedState && failures < 3) {
          console.log(
            `[LAN Discovery] Using cached state for light ${id.substring(0, 8)} (${failures} consecutive failures)`,
          );
          lights.push({
            ...cachedState,
            connected: false, // Mark as not currently connected
            reachable: false,
          });
        } else {
          console.warn(`[LAN Discovery] Dropping light ${id.substring(0, 8)} after ${failures} consecutive failures`);
        }
      }
    }

    return lights;
  }

  async control(lightId: string, control: LightControl): Promise<void> {
    const light = this.lights.get(lightId);
    if (!light) throw new Error("Light not found");

    console.log(`[LAN Control] Light: ${lightId.substring(0, 8)}, Requested:`, control);

    const duration = control.duration ?? 1000;

    // Track control time for cooldown logic
    this.lastControlTime.set(lightId, Date.now());

    // Handle power separately
    if (control.power !== undefined) {
      console.log(`[LAN Control] Setting power to ${control.power}`);
      await new Promise<void>((resolve, reject) => {
        if (control.power) {
          light.on(duration, () => resolve());
        } else {
          light.off(duration, () => resolve());
        }
        setTimeout(() => reject(new Error("Control timeout")), 10000);
      });
    }

    // For color/brightness/temp changes, ALWAYS get fresh state first to preserve other values
    if (
      control.hue !== undefined ||
      control.saturation !== undefined ||
      control.brightness !== undefined ||
      control.kelvin !== undefined
    ) {
      // Get FRESH current state
      const state = await new Promise<LifxLanLightState | null>((resolve, reject) => {
        light.getState((err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      if (!state) {
        throw new Error("Failed to get light state");
      }

      // Log raw state from bulb
      console.log(`[LAN Control] Raw state from bulb:`, state.color);

      // IMPORTANT: The lifx-lan-client library handles ALL conversions for us!
      // When READING (getState): ALL values are already in human-readable ranges
      const currentHue = Math.round(state.color.hue); // Already 0-360
      const currentSat = Math.round(state.color.saturation); // Already 0-100
      const currentBri = Math.round(state.color.brightness); // Already 0-100
      const currentKelvin = state.color.kelvin;
      console.log(
        `[LAN Control] Current state from bulb: H:${currentHue}° S:${currentSat}% B:${currentBri}% K:${currentKelvin}K`,
      );

      // Preserve all values we're not explicitly changing
      const hue = control.hue ?? currentHue;
      const sat = control.saturation ?? currentSat;

      // IMPORTANT: If brightness is not explicitly set and current brightness is 0,
      // default to 100% when changing color/temp (otherwise light appears off)
      let bri = control.brightness ?? currentBri;
      if (
        bri === 0 &&
        control.brightness === undefined &&
        (control.hue !== undefined || control.saturation !== undefined || control.kelvin !== undefined)
      ) {
        console.log(`[LAN Control] WARNING: Brightness is 0%, defaulting to 100% for color/temp change`);
        bri = 100;
      }

      const kelvin = control.kelvin ?? currentKelvin;

      console.log(`[LAN Control] Sending to bulb: H:${hue}° S:${sat}% B:${bri}% K:${kelvin}K`);

      // The library's color() method expects ALL values in human-readable ranges:
      // - hue: 0-360 degrees
      // - saturation: 0-100 percent
      // - brightness: 0-100 percent
      // - kelvin: absolute value
      const hueValue = Math.round(hue); // Already 0-360
      const satValue = Math.round(sat); // Already 0-100
      const briValue = Math.round(bri); // Already 0-100

      console.log(`[LAN Control] Sending values: H:${hueValue}° S:${satValue}% B:${briValue}% K:${kelvin}`);
      console.log(
        `[LAN Control] Types: H:${typeof hueValue} S:${typeof satValue} B:${typeof briValue} K:${typeof kelvin}`,
      );

      // Set all color properties at once (required by LIFX LAN protocol)
      await new Promise<void>((resolve, reject) => {
        console.log(`[LAN Control] Calling light.color with:`, { hueValue, satValue, briValue, kelvin, duration });
        light.color(hueValue, satValue, briValue, kelvin, duration, () => resolve());
        setTimeout(() => reject(new Error("Control timeout")), 10000);
      });
      console.log(`[LAN Control] Command sent successfully`);
    }
  }

  destroy(): void {
    if (this.client) {
      this.client.destroy();
    }
  }
}
