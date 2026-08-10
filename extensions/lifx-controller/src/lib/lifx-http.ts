import Lifx from "lifxjs";
import { LIFXLight, LightControl } from "./types";

interface LifxHttpLight {
  id: string;
  label: string;
  power: string;
  brightness: number;
  connected: boolean;
  reachable: boolean;
  color: {
    hue: number;
    saturation: number;
    kelvin: number;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LifxClient = any;

export class LIFXHttpClient {
  private client: LifxClient = null;

  async initialize(apiToken: string): Promise<void> {
    if (!apiToken) {
      throw new Error("HTTP API token is required");
    }
    this.client = new Lifx();
    this.client.init({ appToken: apiToken });
  }

  async getLights(): Promise<LIFXLight[]> {
    if (!this.client) throw new Error("Client not initialized");
    const response = await this.client.get.all();

    return response.map((light: LifxHttpLight) => ({
      id: light.id,
      label: light.label,
      power: light.power === "on",
      brightness: Math.round(light.brightness * 100),
      hue: Math.round(light.color.hue),
      saturation: Math.round(light.color.saturation * 100),
      kelvin: light.color.kelvin,
      connected: light.connected,
      source: "http" as const,
      reachable: light.reachable,
    }));
  }

  async control(lightId: string, control: LightControl): Promise<void> {
    if (!this.client) throw new Error("Client not initialized");
    const duration = (control.duration ?? 1000) / 1000; // Convert to seconds

    // Handle power separately
    if (control.power !== undefined) {
      await this.client.power.light(lightId, control.power ? "on" : "off", duration);
    }

    // For color changes, get fresh state to preserve values we're not changing
    if (
      control.hue !== undefined ||
      control.saturation !== undefined ||
      control.brightness !== undefined ||
      control.kelvin !== undefined
    ) {
      // Get current light state to preserve unchanged values
      // Note: The lifxjs library doesn't support fetching individual lights by ID,
      // so we fetch all lights and filter. For users with many lights, this may be
      // less efficient, but it's the only approach available with this library.
      const lights = await this.client.get.all();
      const currentLight = lights.find((l: LifxHttpLight) => l.id === lightId);

      if (!currentLight) {
        throw new Error("Light not found");
      }

      const colorConfig: Record<string, number> = { duration };

      // Preserve all values, only override what's specified
      colorConfig.hue = control.hue ?? Math.round(currentLight.color.hue);
      colorConfig.saturation = (control.saturation ?? Math.round(currentLight.color.saturation * 100)) / 100;
      colorConfig.brightness = (control.brightness ?? Math.round(currentLight.brightness * 100)) / 100;
      colorConfig.kelvin = control.kelvin ?? currentLight.color.kelvin;

      await this.client.color.light(lightId, colorConfig);
    }
  }
}
