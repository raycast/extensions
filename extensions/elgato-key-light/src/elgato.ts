import axios from "axios";
import BonjourService from "bonjour-service";
import { waitUntil } from "./utils";
import { environment, Cache, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

// Define the ElgatoService interface - represents the service returned by bonjour
interface ElgatoService {
  name: string;
  type: string;
  protocol: string;
  addresses: string[];
  displayName?: string;
  referer: {
    address: string;
    family: string;
    port: number;
    size: number;
  };
  port: number;
  host: string;
  fqdn: string;
}

const WARM_TEMPERATURE = 344; // 2900K (warmest)
const COLD_TEMPERATURE = 143; // 7000K (coolest)
const TEMPERATURE_STEP = (WARM_TEMPERATURE - COLD_TEMPERATURE) / 20; // 5% step

// Helper functions to convert between internal values and Kelvin
function internalToKelvin(internalValue: number): number {
  // Linear interpolation between 2900K (344) and 7000K (143)
  return Math.round(2900 + ((7000 - 2900) * (344 - internalValue)) / (344 - 143));
}

function kelvinToInternal(kelvinValue: number): number {
  // Linear interpolation between 7000K (143) and 2900K (344)
  return Math.round(143 + ((7000 - kelvinValue) / (7000 - 2900)) * (344 - 143));
}

export function convertFormTemperatureToActual(formTemp: number) {
  return Math.round(COLD_TEMPERATURE + (formTemp / 100) * (WARM_TEMPERATURE - COLD_TEMPERATURE));
}

export function convertActualTemperatureToForm(actualTemp: number) {
  return Math.round(((actualTemp - COLD_TEMPERATURE) / (WARM_TEMPERATURE - COLD_TEMPERATURE)) * 100);
}

// Export the function to avoid unused variable warning since it's a useful utility function
export { internalToKelvin, kelvinToInternal };

export type KeyLightSettings = {
  /**
   * The brightness of the key light.
   * @default 20
   * @min 0
   * @max 100
   */
  brightness?: number;
  /**
   * The temperature of the key light.
   * @default 200
   * @min 143
   * @max 344
   */
  temperature?: number;
  /**
   * Whether the key light is on.
   * @default true
   */
  on?: boolean;
};

interface CacheData {
  lights: Array<{ service: ElgatoService }>;
  lastDiscoveryTime: number;
  expiresAt: number; // Unix timestamp in milliseconds
}

interface AccessoryInfo {
  displayName?: string;
}

type KeyLightTarget = {
  input: string;
  normalized: string;
};

const CACHE_KEY = "elgato-keylights";
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds (7 days * 24 hours * 60 minutes * 60 seconds * 1000 milliseconds)

export class KeyLight {
  private static cache = new Cache();
  static keyLights: Array<KeyLight>;

  private static async loadCache(): Promise<CacheData | null> {
    try {
      const data = await this.cache.get(CACHE_KEY);
      if (!data) return null;

      const cacheData = JSON.parse(data) as CacheData;

      // Check if cache has expired
      if (Date.now() > cacheData.expiresAt) {
        await this.clearCache();
        return null;
      }

      return cacheData;
    } catch (e) {
      if (environment.isDevelopment) {
        console.error("Failed to load cache:", e);
      }
    }
    return null;
  }

  private static async saveCache(lights: Array<KeyLight>) {
    try {
      const data: CacheData = {
        lights: lights.map((light) => ({ service: light.service })),
        lastDiscoveryTime: Date.now(),
        expiresAt: Date.now() + CACHE_EXPIRY,
      };
      await this.cache.set(CACHE_KEY, JSON.stringify(data));
    } catch (e) {
      if (environment.isDevelopment) {
        console.error("Failed to save cache:", e);
      }
    }
  }

  private static async clearCache() {
    try {
      await this.cache.remove(CACHE_KEY);
    } catch (e) {
      if (environment.isDevelopment) {
        console.error("Failed to clear cache:", e);
      }
    }
    this.keyLights = [];
  }

  private static async getAccessoryInfo(address: string, port: number) {
    try {
      const response = await axios.get<AccessoryInfo>(`http://${address}:${port}/elgato/accessory-info`, {
        timeout: 2000,
      });
      return response.data;
    } catch (error) {
      if (environment.isDevelopment) {
        console.error(`Failed to fetch accessory info for ${address}:${port}`, error);
      }
      return undefined;
    }
  }

  static async discover(forceRefresh = false) {
    // Try to load from cache first
    if (!forceRefresh) {
      const cache = await this.loadCache();
      if (cache) {
        if (environment.isDevelopment) {
          console.log("Found cached lights, creating instances...");
        }
        this.keyLights = cache.lights.map((light) => new KeyLight(light.service));
        if (environment.isDevelopment) {
          console.log(
            "Using cached Key Lights:",
            this.keyLights.map((light) => `${light.service.name} at ${light.service.referer.address}`).join(", "),
          );
        }
        return this.keyLights[0];
      }
    }

    const bonjour = new BonjourService();
    this.keyLights = [];

    await showToast({
      style: Toast.Style.Animated,
      title: "Discovering Key Lights...",
      message: "Searching for Elgato Key Lights on your network",
    });

    let discoveryComplete = false;

    const find = new Promise<KeyLight>((resolve, reject) => {
      const browser = bonjour.find({ type: "elg" }, (service: ElgatoService) => {
        // Log complete service object for debugging
        if (environment.isDevelopment) {
          console.log(
            "Bonjour service details:",
            JSON.stringify(
              {
                name: service.name,
                type: service.type,
                protocol: service.protocol,
                addresses: service.addresses,
                referer: service.referer,
                port: service.port,
                host: service.host,
                fqdn: service.fqdn,
              },
              null,
              2,
            ),
          );
        }

        // Get all possible addresses
        const addresses = service.addresses || [];
        const refererAddress = service.referer?.address;
        if (refererAddress && !addresses.includes(refererAddress)) {
          addresses.push(refererAddress);
        }

        if (environment.isDevelopment) {
          console.log("Available addresses:", addresses);
        }

        // Filter out invalid addresses
        const validAddresses = addresses.filter(
          (addr: string) => addr && addr !== "0.0.0.0" && addr !== "127.0.0.1" && !addr.startsWith("fe80:"), // Filter out link-local IPv6
        );

        if (environment.isDevelopment) {
          console.log("Valid addresses:", validAddresses);
        }

        if (validAddresses.length === 0) {
          if (environment.isDevelopment) {
            console.error("No valid IP addresses found for service:", service.name);
          }
          return;
        }

        // Use the first valid address
        const address = validAddresses[0];
        if (environment.isDevelopment) {
          console.log(`Using address ${address} for Key Light ${service.name}`);
        }

        // Check if we already have this light
        const isDuplicate = this.keyLights.some(
          (light) => light.service.name === service.name && light.service.referer.address === address,
        );

        if (isDuplicate) {
          if (environment.isDevelopment) {
            console.log(`Skipping duplicate Key Light: ${service.name}`);
          }
          return;
        }

        // Create a modified service object with the correct address
        const serviceWithAddress = {
          ...service,
          referer: {
            ...service.referer,
            address: address,
          },
        };

        const serviceWithDisplayName = {
          ...serviceWithAddress,
          displayName: service.name,
        };

        const keyLight = new KeyLight(serviceWithDisplayName);
        // Push synchronously, with no `await` in between, so a light is
        // reflected in `keyLights` the instant it's confirmed. This guarantees
        // the discovery timeout below can never observe an empty array for a
        // light that has already been found.
        this.keyLights.push(keyLight);

        // Save to cache as soon as we find lights, without waiting on enrichment below
        this.saveCache(this.keyLights);

        // If discovery timeout has already elapsed, resolve immediately now that a light was found
        if (discoveryComplete) {
          if (environment.isDevelopment) {
            console.log(`Discovery complete. Found ${this.keyLights.length} Key Light(s)`);
          }
          showToast({
            style: Toast.Style.Success,
            title: "Discovery Complete",
            message: `Found ${this.keyLights.length} Key Light(s)`,
          });
          resolve(keyLight);
          browser.stop();
          bonjour.destroy();
          clearTimeout(discoveryTimeout);
        }

        // Enrich the light with its display name in the background. This is
        // purely cosmetic, so it must never gate (or be gated by) discovery
        // resolution/rejection above.
        this.getAccessoryInfo(address, service.port).then((accessoryInfo) => {
          keyLight.service.displayName = accessoryInfo?.displayName || service.name;

          showToast({
            style: Toast.Style.Animated,
            title: "Found Key Light",
            message: `Discovered ${keyLight.service.displayName} at ${address}`,
          });

          this.saveCache(this.keyLights);
        });
      });

      browser.on("up", (service: ElgatoService) => {
        if (environment.isDevelopment) {
          console.log("Service came up:", service.name);
        }
      });

      browser.on("down", (service: ElgatoService) => {
        if (environment.isDevelopment) {
          console.log("Service went down:", service.name);
        }
      });

      browser.on("error", (error: Error) => {
        if (environment.isDevelopment) {
          console.error("Bonjour browser error:", error);
        }
        showFailureToast(error, { title: "Discovery Failed" });
        reject(new Error(`Bonjour discovery error: ${error.toString()}`));
      });

      const discoveryTimeout = setTimeout(() => {
        if (environment.isDevelopment) {
          console.log(`Discovery timeout reached. Found ${this.keyLights.length} light(s)`);
        }
        discoveryComplete = true;

        if (this.keyLights.length > 0) {
          if (environment.isDevelopment) {
            console.log(
              "Successfully discovered Key Lights:",
              this.keyLights.map((light) => `${light.service.name} at ${light.service.referer.address}`).join(", "),
            );
          }
          showToast({
            style: Toast.Style.Success,
            title: "Discovery Complete",
            message: `Found ${this.keyLights.length} Key Light(s)`,
          });
          resolve(this.keyLights[0]);
          browser.stop();
          bonjour.destroy();
          clearTimeout(discoveryTimeout);
        } else {
          showFailureToast(new Error("Could not discover any Key Lights on your network"), {
            title: "No Key Lights Found",
          });
          reject(new Error("Cannot discover any Key Lights in the network"));
        }
      }, 5000);
    });

    try {
      return await waitUntil(find, { timeout: 5000, timeoutMessage: "Cannot discover any Key Lights in the network" });
    } catch (error) {
      if (environment.isDevelopment) {
        console.error("Discovery failed:", error);
      }
      showFailureToast(error, { title: "Discovery Failed" });
      throw error;
    }
  }

  public service: ElgatoService;

  private constructor(service: ElgatoService) {
    this.service = service;
  }

  private static normalizeTarget(target: string) {
    return target.trim().toLowerCase();
  }

  private static targetCandidates(light: KeyLight) {
    return [
      light.service.displayName,
      light.service.name,
      light.service.host,
      light.service.fqdn,
      light.service.referer.address,
      ...(light.service.addresses ?? []),
    ]
      .filter((value): value is string => Boolean(value))
      .map((value) => this.normalizeTarget(value));
  }

  static getDiscoveredLights() {
    return this.keyLights ?? [];
  }

  static describeLight(light: KeyLight) {
    return `${light.service.displayName || light.service.name} (${light.service.referer.address})`;
  }

  static getTargetLights(targets?: string[]) {
    const lights = this.getDiscoveredLights();

    // `undefined` means "no filter configured" (target all lights), while an
    // explicit empty array means "targeting specific lights, but none are
    // selected" and must match nothing rather than falling back to all lights.
    if (targets === undefined) {
      return lights;
    }
    if (targets.length === 0) {
      return [];
    }

    const parsedTargets = targets
      .map((target) => ({ input: target, normalized: this.normalizeTarget(target) }))
      .filter((target) => target.normalized.length > 0);

    return lights.filter((light) => {
      const candidates = this.targetCandidates(light);
      return parsedTargets.some((target) => candidates.includes(target.normalized));
    });
  }

  static getMissingTargets(targets?: string[]) {
    if (!targets || targets.length === 0) {
      return [];
    }

    const parsedTargets: KeyLightTarget[] = targets
      .map((target) => ({ input: target, normalized: this.normalizeTarget(target) }))
      .filter((target) => target.normalized.length > 0);

    return parsedTargets.filter((target) => !this.getTargetLights([target.input]).length).map((target) => target.input);
  }

  private getTargetLightsOrThrow(targets?: string[]) {
    const lights = KeyLight.getTargetLights(targets);
    if (lights.length > 0) {
      return lights;
    }

    if (targets && targets.length === 0) {
      throw new Error(
        "No target Key Lights are selected. Choose at least one light in the extension preferences, or switch to targeting all lights.",
      );
    }

    const configuredTargets = targets?.filter(Boolean) ?? [];
    if (configuredTargets.length === 0) {
      throw new Error("No Key Lights were discovered");
    }

    const discoveredLights = KeyLight.getDiscoveredLights();
    const availableLights = discoveredLights.length
      ? discoveredLights.map((light) => KeyLight.describeLight(light)).join(", ")
      : "none";
    const missingTargets = KeyLight.getMissingTargets(configuredTargets).join(", ");
    throw new Error(
      `No configured target lights were found. Missing: ${missingTargets}. Discovered lights: ${availableLights}.`,
    );
  }

  private async rediscoverAndGetTargets(targets?: string[]) {
    await KeyLight.clearCache();
    await KeyLight.discover(true);
    return this.getTargetLightsOrThrow(targets);
  }

  private findMatchingLight(light: KeyLight, candidates: KeyLight[]) {
    const targetCandidates = KeyLight.targetCandidates(light);
    return candidates.find((candidate) => {
      const candidateTargets = KeyLight.targetCandidates(candidate);
      return candidateTargets.some((candidateTarget) => targetCandidates.includes(candidateTarget));
    });
  }

  private isConnectionError(error: Error) {
    return (
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("ECONNRESET") ||
      error.message.includes("ETIMEDOUT") ||
      error.message.includes("EHOSTUNREACH")
    );
  }

  async getSettings(targets?: string[]) {
    const statuses = new Array<KeyLightSettings>();
    const lights = this.getTargetLightsOrThrow(targets);

    for (let x = 0; x < lights.length; x++) {
      const service = lights[x].service;
      const keyLight = await this.getKeyLight(service);
      statuses.push({
        on: keyLight.on,
        brightness: keyLight.brightness,
        temperature: keyLight.temperature,
      });
    }

    return statuses;
  }

  async toggle(targets?: string[]) {
    const lights = this.getTargetLightsOrThrow(targets);

    const currentStates = [];
    for (const light of lights) {
      try {
        const keyLight = await this.getKeyLight(light.service);
        currentStates.push({ light, state: keyLight.on });
      } catch (e) {
        const error = e as Error;
        if (!this.isConnectionError(error)) {
          throw error;
        }

        if (environment.isDevelopment) {
          console.error("Connection error, attempting rediscovery...");
        }

        const refreshedLights = await this.rediscoverAndGetTargets(targets);
        const refreshedLight = this.findMatchingLight(light, refreshedLights);
        if (!refreshedLight) {
          throw new Error(`Failed to re-match Key Light ${KeyLight.describeLight(light)} after rediscovery`);
        }

        const keyLight = await this.getKeyLight(refreshedLight.service);
        currentStates.push({ light: refreshedLight, state: keyLight.on });
      }
    }

    const newState = !currentStates[0].state;

    for (const { light } of currentStates) {
      try {
        await this.updateKeyLight(light.service, { on: newState });
      } catch (e) {
        const error = e as Error;
        if (!this.isConnectionError(error)) {
          throw error;
        }

        if (environment.isDevelopment) {
          console.error("Connection error, attempting rediscovery...");
        }

        const refreshedLights = await this.rediscoverAndGetTargets(targets);
        const refreshedLight = this.findMatchingLight(light, refreshedLights);
        if (!refreshedLight) {
          throw new Error(`Failed to re-match Key Light ${KeyLight.describeLight(light)} after rediscovery`);
        }

        await this.updateKeyLight(refreshedLight.service, { on: newState });
      }
    }

    return newState;
  }

  async turnOn(targets?: string[]) {
    const lights = this.getTargetLightsOrThrow(targets);
    for (let x = 0; x < lights.length; x++) {
      const service = lights[x].service;
      await this.updateKeyLight(service, { on: true });
    }
  }

  async turnOff(targets?: string[]) {
    const lights = this.getTargetLightsOrThrow(targets);
    for (let x = 0; x < lights.length; x++) {
      const service = lights[x].service;
      await this.updateKeyLight(service, { on: false });
    }
  }

  async update(options: { brightness?: number; temperature?: number; on?: boolean }, targets?: string[]) {
    const lights = this.getTargetLightsOrThrow(targets);
    for (let x = 0; x < lights.length; x++) {
      const service = lights[x].service;
      await this.updateKeyLight(service, options);
    }
  }

  async increaseBrightness(targets?: string[]) {
    let newBrightness;
    const lights = this.getTargetLightsOrThrow(targets);
    for (let x = 0; x < lights.length; x++) {
      const light = lights[x];
      try {
        const keyLight = await this.getKeyLight(light.service);
        newBrightness = Math.min(keyLight.brightness + 5, 100);
        await this.updateKeyLight(light.service, { brightness: newBrightness });
      } catch (e) {
        const error = e as Error;
        if (this.isConnectionError(error)) {
          if (environment.isDevelopment) {
            console.error(`Connection error for Key Light ${x + 1}, attempting rediscovery...`);
          }
          try {
            const refreshedLights = await this.rediscoverAndGetTargets(targets);
            const refreshedLight = this.findMatchingLight(light, refreshedLights);
            if (!refreshedLight) {
              throw new Error(`Failed to re-match Key Light ${KeyLight.describeLight(light)} after rediscovery`);
            }

            const keyLight = await this.getKeyLight(refreshedLight.service);
            newBrightness = Math.min(keyLight.brightness + 5, 100);
            await this.updateKeyLight(refreshedLight.service, { brightness: newBrightness });
          } catch (retryError) {
            throw new Error(`Failed increasing brightness: ${(retryError as Error).message}`);
          }
        } else {
          throw new Error(`Failed increasing brightness: ${error.message}`);
        }
      }
    }

    return newBrightness;
  }

  async decreaseBrightness(targets?: string[]) {
    let newBrightness;
    const lights = this.getTargetLightsOrThrow(targets);
    for (let x = 0; x < lights.length; x++) {
      const light = lights[x];
      try {
        const keyLight = await this.getKeyLight(light.service);
        newBrightness = Math.max(keyLight.brightness - 5, 0);
        await this.updateKeyLight(light.service, { brightness: newBrightness });
      } catch (e) {
        const error = e as Error;
        if (this.isConnectionError(error)) {
          if (environment.isDevelopment) {
            console.error(`Connection error for Key Light ${x + 1}, attempting rediscovery...`);
          }
          try {
            const refreshedLights = await this.rediscoverAndGetTargets(targets);
            const refreshedLight = this.findMatchingLight(light, refreshedLights);
            if (!refreshedLight) {
              throw new Error(`Failed to re-match Key Light ${KeyLight.describeLight(light)} after rediscovery`);
            }

            const keyLight = await this.getKeyLight(refreshedLight.service);
            newBrightness = Math.max(keyLight.brightness - 5, 0);
            await this.updateKeyLight(refreshedLight.service, { brightness: newBrightness });
          } catch (retryError) {
            throw new Error(`Failed decreasing brightness: ${(retryError as Error).message}`);
          }
        } else {
          throw new Error(`Failed decreasing brightness: ${error.message}`);
        }
      }
    }

    return newBrightness;
  }

  async increaseTemperature(targets?: string[]) {
    let newTemperature;
    const lights = this.getTargetLightsOrThrow(targets);
    for (let x = 0; x < lights.length; x++) {
      const light = lights[x];
      try {
        const keyLight = await this.getKeyLight(light.service);
        newTemperature = Math.min(keyLight.temperature + TEMPERATURE_STEP, WARM_TEMPERATURE);
        await this.updateKeyLight(light.service, { temperature: newTemperature });
      } catch (e) {
        const error = e as Error;
        if (this.isConnectionError(error)) {
          if (environment.isDevelopment) {
            console.error(`Connection error for Key Light ${x + 1}, attempting rediscovery...`);
          }
          try {
            const refreshedLights = await this.rediscoverAndGetTargets(targets);
            const refreshedLight = this.findMatchingLight(light, refreshedLights);
            if (!refreshedLight) {
              throw new Error(`Failed to re-match Key Light ${KeyLight.describeLight(light)} after rediscovery`);
            }

            const keyLight = await this.getKeyLight(refreshedLight.service);
            newTemperature = Math.min(keyLight.temperature + TEMPERATURE_STEP, WARM_TEMPERATURE);
            await this.updateKeyLight(refreshedLight.service, { temperature: newTemperature });
          } catch (retryError) {
            throw new Error(`Failed increasing temperature: ${(retryError as Error).message}`);
          }
        } else {
          throw new Error(`Failed increasing temperature: ${error.message}`);
        }
      }
    }

    return newTemperature;
  }

  async decreaseTemperature(targets?: string[]) {
    let newTemperature;
    const lights = this.getTargetLightsOrThrow(targets);
    for (let x = 0; x < lights.length; x++) {
      const light = lights[x];
      try {
        const keyLight = await this.getKeyLight(light.service);
        newTemperature = Math.max(keyLight.temperature - TEMPERATURE_STEP, COLD_TEMPERATURE);
        await this.updateKeyLight(light.service, { temperature: newTemperature });
      } catch (e) {
        const error = e as Error;
        if (this.isConnectionError(error)) {
          if (environment.isDevelopment) {
            console.error(`Connection error for Key Light ${x + 1}, attempting rediscovery...`);
          }
          try {
            const refreshedLights = await this.rediscoverAndGetTargets(targets);
            const refreshedLight = this.findMatchingLight(light, refreshedLights);
            if (!refreshedLight) {
              throw new Error(`Failed to re-match Key Light ${KeyLight.describeLight(light)} after rediscovery`);
            }

            const keyLight = await this.getKeyLight(refreshedLight.service);
            newTemperature = Math.max(keyLight.temperature - TEMPERATURE_STEP, COLD_TEMPERATURE);
            await this.updateKeyLight(refreshedLight.service, { temperature: newTemperature });
          } catch (retryError) {
            throw new Error(`Failed decreasing temperature: ${(retryError as Error).message}`);
          }
        } else {
          throw new Error(`Failed decreasing temperature: ${error.message}`);
        }
      }
    }

    return newTemperature;
  }

  private async getKeyLight(service: ElgatoService) {
    const response = await axios.get(`http://${service.referer.address}:${service.port}/elgato/lights`);
    return response.data.lights[0];
  }

  private async updateKeyLight(service: ElgatoService, options: KeyLightSettings) {
    const response = await axios.put(`http://${service.referer.address}:${service.port}/elgato/lights`, {
      lights: [
        {
          on: options.on,
          brightness: options.brightness,
          temperature: options.temperature,
        },
      ],
    });
    return response.data.lights[0];
  }
}

export { WARM_TEMPERATURE, COLD_TEMPERATURE };
