import axios from "axios";
import BonjourService from "bonjour-service";
import { waitUntil } from "./utils";
import fs from "fs";
import os from "os";
import path from "path";
import { environment, showHUD } from "@raycast/api";

interface ElgatoService {
  name: string;
  type: string;
  protocol: string;
  addresses: string[];
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

const WARM_TEMPERATURE = 344; // 2900k
const COLD_TEMPERATURE = 143; // 7000k
const TEMPERATURE_STEP = (WARM_TEMPERATURE - COLD_TEMPERATURE) / 20; // 5%

export function convertFormTemperatureToActual(formTemp: number) {
  return Math.round(COLD_TEMPERATURE + (formTemp / 100) * (WARM_TEMPERATURE - COLD_TEMPERATURE));
}

export function convertActualTemperatureToForm(actualTemp: number) {
  return Math.round(((actualTemp - COLD_TEMPERATURE) / (WARM_TEMPERATURE - COLD_TEMPERATURE)) * 100);
}

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

export class KeyLight {
  private static CACHE_FILE = path.join(os.tmpdir(), "raycast-elgato-keylights.json");
  static keyLights: Array<KeyLight>;

  private static loadCache(): CacheData | null {
    try {
      if (fs.existsSync(this.CACHE_FILE)) {
        const data = JSON.parse(fs.readFileSync(this.CACHE_FILE, "utf8"));
        return data;
      }
    } catch (e) {
      if (environment.isDevelopment) {
        console.error("Failed to load cache:", e);
      }
    }
    return null;
  }

  private static saveCache(lights: Array<KeyLight>) {
    try {
      const data: CacheData = {
        lights: lights.map((light) => ({ service: light.service })),
        lastDiscoveryTime: Date.now(),
      };
      fs.writeFileSync(this.CACHE_FILE, JSON.stringify(data));
    } catch (e) {
      if (environment.isDevelopment) {
        console.error("Failed to save cache:", e);
      }
    }
  }

  private static clearCache() {
    try {
      if (fs.existsSync(this.CACHE_FILE)) {
        fs.unlinkSync(this.CACHE_FILE);
      }
    } catch (e) {
      if (environment.isDevelopment) {
        console.error("Failed to clear cache:", e);
      }
    }
    this.keyLights = [];
  }

  static async discover(forceRefresh = false) {
    // Try to load from cache first
    if (!forceRefresh) {
      const cache = this.loadCache();
      if (cache) {
        if (environment.isDevelopment) {
          console.log("Found cached lights, creating instances...");
        }
        this.keyLights = cache.lights.map((light) => new KeyLight(light.service));
        if (environment.isDevelopment) {
          console.log(
            "Using cached Key Lights:",
            this.keyLights.map((light) => `${light.service.name} at ${light.service.referer.address}`).join(", ")
          );
        }
        return this.keyLights[0];
      }
    }

    const bonjour = new BonjourService();
    this.keyLights = [];

    if (environment.isDevelopment) {
      console.log("Starting Bonjour discovery for Key Lights...");
    }

    let discoveryTimeout: NodeJS.Timeout;
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
              2
            )
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
          (addr: string) => addr && addr !== "0.0.0.0" && addr !== "127.0.0.1" && !addr.startsWith("fe80:") // Filter out link-local IPv6
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
          (light) => light.service.name === service.name && light.service.referer.address === address
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

        const keyLight = new KeyLight(serviceWithAddress);
        this.keyLights.push(keyLight);
        if (environment.isDevelopment) {
          console.log(`Added Key Light to list. Total lights found: ${this.keyLights.length}`);
        }

        // Save to cache as soon as we find lights
        this.saveCache(this.keyLights);

        // If discovery timeout has elapsed and we found at least one light, resolve
        if (discoveryComplete && this.keyLights.length > 0) {
          if (environment.isDevelopment) {
            console.log(`Discovery complete. Found ${this.keyLights.length} Key Light(s)`);
          }
          resolve(keyLight);
          browser.stop();
          bonjour.destroy();
        }
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

      // @ts-ignore - Bonjour types are incomplete, error event exists but isn't typed
      browser.on("error", (error: Error) => {
        if (environment.isDevelopment) {
          console.error("Bonjour browser error:", error);
        }
        reject(new Error(`Bonjour discovery error: ${error.toString()}`));
      });

      discoveryTimeout = setTimeout(() => {
        if (environment.isDevelopment) {
          console.log(`Discovery timeout reached. Found ${this.keyLights.length} light(s)`);
        }
        discoveryComplete = true;

        if (this.keyLights.length > 0) {
          if (environment.isDevelopment) {
            console.log(
              "Successfully discovered Key Lights:",
              this.keyLights.map((light) => `${light.service.name} at ${light.service.referer.address}`).join(", ")
            );
          }
          resolve(this.keyLights[0]);
          browser.stop();
          bonjour.destroy();
        } else {
          reject(new Error("Cannot discover any Key Lights in the network"));
        }
      }, 5000);
    });

    try {
      return await waitUntil(find, { timeout: 6000, timeoutMessage: "Cannot discover any Key Lights in the network" });
    } catch (error) {
      if (environment.isDevelopment) {
        console.error("Discovery failed:", error);
      }
      throw error;
    }
  }

  private service: ElgatoService;

  private constructor(service: ElgatoService) {
    this.service = service;
  }

  async getSettings() {
    const statuses = new Array<KeyLightSettings>();

    for (let x = 0; x < KeyLight.keyLights.length; x++) {
      const service = KeyLight.keyLights[x].service;
      const keyLight = await this.getKeyLight(service);
      statuses.push({
        on: keyLight.on,
        brightness: keyLight.brightness,
        temperature: keyLight.temperature,
      });
    }

    return statuses;
  }

  async toggle() {
    if (!KeyLight.keyLights || KeyLight.keyLights.length === 0) {
      throw new Error("No Key Lights were discovered");
    }

    let newState;
    for (let x = 0; x < KeyLight.keyLights.length; x++) {
      try {
        const keyLight = await this.getKeyLight(KeyLight.keyLights[x].service);
        if (environment.isDevelopment) {
          console.log(`Current state of Key Light ${x + 1}: ${keyLight.on ? "ON" : "OFF"}`);
        }
        newState = !keyLight.on;
        await this.updateKeyLight(KeyLight.keyLights[x].service, { on: newState });
        if (environment.isDevelopment) {
          console.log(`Successfully toggled Key Light ${x + 1} to: ${newState ? "ON" : "OFF"}`);
        }
      } catch (e) {
        const error = e as Error;
        // Only clear cache and retry for connection errors
        if (
          error.message.includes("ECONNREFUSED") ||
          error.message.includes("ETIMEDOUT") ||
          error.message.includes("EHOSTUNREACH")
        ) {
          if (environment.isDevelopment) {
            console.error(`Connection error for Key Light ${x + 1}, attempting rediscovery...`);
          }
          KeyLight.clearCache();
          try {
            await KeyLight.discover(true);
            const keyLight = await this.getKeyLight(KeyLight.keyLights[x].service);
            if (environment.isDevelopment) {
              console.log(`Current state of Key Light ${x + 1}: ${keyLight.on ? "ON" : "OFF"}`);
            }
            newState = !keyLight.on;
            await this.updateKeyLight(KeyLight.keyLights[x].service, { on: newState });
            if (environment.isDevelopment) {
              console.log(`Successfully toggled Key Light ${x + 1} to: ${newState ? "ON" : "OFF"}`);
            }
          } catch (retryError) {
            throw new Error(`Failed toggling Key Light ${x + 1}: ${(retryError as Error).message}`);
          }
        } else {
          // For other errors, just propagate them without clearing cache
          throw new Error(`Failed toggling Key Light ${x + 1}: ${error.message}`);
        }
      }
    }

    return newState;
  }

  async turnOn() {
    for (let x = 0; x < KeyLight.keyLights.length; x++) {
      const service = KeyLight.keyLights[x].service;
      await this.updateKeyLight(service, { on: true });
    }
  }

  async turnOff() {
    for (let x = 0; x < KeyLight.keyLights.length; x++) {
      const service = KeyLight.keyLights[x].service;
      await this.updateKeyLight(service, { on: false });
    }
  }

  async update(options: { brightness?: number; temperature?: number; on?: boolean }) {
    for (let x = 0; x < KeyLight.keyLights.length; x++) {
      const service = KeyLight.keyLights[x].service;
      await this.updateKeyLight(service, options);
    }
  }

  async increaseBrightness() {
    let newBrightness;
    for (let x = 0; x < KeyLight.keyLights.length; x++) {
      try {
        const keyLight = await this.getKeyLight(KeyLight.keyLights[x].service);
        newBrightness = Math.min(keyLight.brightness + 5, 100);
        await this.updateKeyLight(KeyLight.keyLights[x].service, { brightness: newBrightness });
      } catch (e) {
        const error = e as Error;
        // Only clear cache and retry for connection errors
        if (
          error.message.includes("ECONNREFUSED") ||
          error.message.includes("ETIMEDOUT") ||
          error.message.includes("EHOSTUNREACH")
        ) {
          if (environment.isDevelopment) {
            console.error(`Connection error for Key Light ${x + 1}, attempting rediscovery...`);
          }
          KeyLight.clearCache();
          try {
            await KeyLight.discover(true);
            const keyLight = await this.getKeyLight(KeyLight.keyLights[x].service);
            newBrightness = Math.min(keyLight.brightness + 5, 100);
            await this.updateKeyLight(KeyLight.keyLights[x].service, { brightness: newBrightness });
          } catch (retryError) {
            throw new Error(`Failed increasing brightness: ${(retryError as Error).message}`);
          }
        } else {
          // For other errors, just propagate them without clearing cache
          throw new Error(`Failed increasing brightness: ${error.message}`);
        }
      }
    }

    return newBrightness;
  }

  async decreaseBrightness() {
    let newBrightness;
    for (let x = 0; x < KeyLight.keyLights.length; x++) {
      try {
        const keyLight = await this.getKeyLight(KeyLight.keyLights[x].service);
        newBrightness = Math.max(keyLight.brightness - 5, 0);
        await this.updateKeyLight(KeyLight.keyLights[x].service, { brightness: newBrightness });
      } catch (e) {
        const error = e as Error;
        // Only clear cache and retry for connection errors
        if (
          error.message.includes("ECONNREFUSED") ||
          error.message.includes("ETIMEDOUT") ||
          error.message.includes("EHOSTUNREACH")
        ) {
          if (environment.isDevelopment) {
            console.error(`Connection error for Key Light ${x + 1}, attempting rediscovery...`);
          }
          KeyLight.clearCache();
          try {
            await KeyLight.discover(true);
            const keyLight = await this.getKeyLight(KeyLight.keyLights[x].service);
            newBrightness = Math.max(keyLight.brightness - 5, 0);
            await this.updateKeyLight(KeyLight.keyLights[x].service, { brightness: newBrightness });
          } catch (retryError) {
            throw new Error(`Failed decreasing brightness: ${(retryError as Error).message}`);
          }
        } else {
          // For other errors, just propagate them without clearing cache
          throw new Error(`Failed decreasing brightness: ${error.message}`);
        }
      }
    }

    return newBrightness;
  }

  async increaseTemperature() {
    let newTemperature;
    for (let x = 0; x < KeyLight.keyLights.length; x++) {
      try {
        const keyLight = await this.getKeyLight(KeyLight.keyLights[x].service);
        newTemperature = Math.max(keyLight.temperature + TEMPERATURE_STEP, COLD_TEMPERATURE);
        await this.updateKeyLight(KeyLight.keyLights[x].service, { temperature: newTemperature });
      } catch (e) {
        const error = e as Error;
        // Only clear cache and retry for connection errors
        if (
          error.message.includes("ECONNREFUSED") ||
          error.message.includes("ETIMEDOUT") ||
          error.message.includes("EHOSTUNREACH")
        ) {
          if (environment.isDevelopment) {
            console.error(`Connection error for Key Light ${x + 1}, attempting rediscovery...`);
          }
          KeyLight.clearCache();
          try {
            await KeyLight.discover(true);
            const keyLight = await this.getKeyLight(KeyLight.keyLights[x].service);
            newTemperature = Math.max(keyLight.temperature + TEMPERATURE_STEP, COLD_TEMPERATURE);
            await this.updateKeyLight(KeyLight.keyLights[x].service, { temperature: newTemperature });
          } catch (retryError) {
            throw new Error(`Failed increasing temperature: ${(retryError as Error).message}`);
          }
        } else {
          // For other errors, just propagate them without clearing cache
          throw new Error(`Failed increasing temperature: ${error.message}`);
        }
      }
    }

    return newTemperature;
  }

  async decreaseTemperature() {
    let newTemperature;
    for (let x = 0; x < KeyLight.keyLights.length; x++) {
      try {
        const keyLight = await this.getKeyLight(KeyLight.keyLights[x].service);
        newTemperature = Math.max(keyLight.temperature - TEMPERATURE_STEP, COLD_TEMPERATURE);
        await this.updateKeyLight(KeyLight.keyLights[x].service, { temperature: newTemperature });
      } catch (e) {
        const error = e as Error;
        // Only clear cache and retry for connection errors
        if (
          error.message.includes("ECONNREFUSED") ||
          error.message.includes("ETIMEDOUT") ||
          error.message.includes("EHOSTUNREACH")
        ) {
          if (environment.isDevelopment) {
            console.error(`Connection error for Key Light ${x + 1}, attempting rediscovery...`);
          }
          KeyLight.clearCache();
          try {
            await KeyLight.discover(true);
            const keyLight = await this.getKeyLight(KeyLight.keyLights[x].service);
            newTemperature = Math.max(keyLight.temperature - TEMPERATURE_STEP, COLD_TEMPERATURE);
            await this.updateKeyLight(KeyLight.keyLights[x].service, { temperature: newTemperature });
          } catch (retryError) {
            throw new Error(`Failed decreasing temperature: ${(retryError as Error).message}`);
          }
        } else {
          // For other errors, just propagate them without clearing cache
          throw new Error(`Failed decreasing temperature: ${error.message}`);
        }
      }
    }

    return newTemperature;
  }

  private async getKeyLight(service: ElgatoService) {
    const url = `http://${service.referer.address}:${service.port}/elgato/lights`;
    if (environment.isDevelopment) {
      console.log(`Fetching Key Light state from: ${url}`);
    }
    try {
      const response = await axios.get(url);
      return response.data.lights[0];
    } catch (e) {
      const error = e as Error;
      if (environment.isDevelopment) {
        console.error(`Failed to get Key Light state: ${error.message}`);
      }
      throw error;
    }
  }

  private async updateKeyLight(
    service: ElgatoService,
    options: { brightness?: number; temperature?: number; on?: boolean }
  ) {
    const url = `http://${service.referer.address}:${service.port}/elgato/lights`;
    if (environment.isDevelopment) {
      console.log(`Updating Key Light at ${url} with options:`, options);
    }
    try {
      await axios.put(url, {
        lights: [
          {
            ...options,
          },
        ],
      });
    } catch (e) {
      const error = e as Error;
      if (environment.isDevelopment) {
        console.error(`Failed to update Key Light: ${error.message}`);
      }
      throw error;
    }
  }
}
