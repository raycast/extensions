import axios from "axios";
import Bonjour, { RemoteService } from "bonjour";
import { waitUntil } from "./utils";
import { getPreferenceValues } from "@raycast/api";

const WARM_TEMPERATURE = 344; // 2900k
const COLD_TEMPERATURE = 143; // 7000k
const TEMPERATURE_STEP = (WARM_TEMPERATURE - COLD_TEMPERATURE) / 20; // 5%

interface Preferences {
  keyLights_count: string;
}

export class KeyLight {
  static keyLights: Array<KeyLight>;

  static async discover() {
    const bonjour = Bonjour();
    this.keyLights = [];

    const preferences = getPreferenceValues<Preferences>();
    const count: number = parseInt(preferences.keyLights_count, 10);

    const find = new Promise<KeyLight>((resolve) => {
      bonjour.find({ type: "elg" }, (service) => {
        const keyLight = new KeyLight(service);
        this.keyLights.push(keyLight);

        if (this.keyLights.length == count) {
          resolve(keyLight);
          bonjour.destroy();
        }
      });
    });

    return waitUntil(find, { timeoutMessage: "Cannot discover any Key Lights in the network" });
  }

  private service: RemoteService;

  private constructor(service: RemoteService) {
    this.service = service;
  }

  async toggle() {
    let newState;
    for (let x = 0; x < KeyLight.keyLights.length; x++) {
      try {
        const keyLight = await this.getKeyLight(KeyLight.keyLights[x].service);
        newState = !keyLight.on;
        await this.updateKeyLight(KeyLight.keyLights[x].service, { on: newState });
      } catch (e) {
        throw new Error("Failed toggling Key Light");
      }
    }

    return newState;
  }

  async increaseBrightness() {
    let newBrightness;
    for (let x = 0; x < KeyLight.keyLights.length; x++) {
      try {
        const keyLight = await this.getKeyLight(KeyLight.keyLights[x].service);
        newBrightness = Math.min(keyLight.brightness + 5, 100);
        await this.updateKeyLight(KeyLight.keyLights[x].service, { brightness: newBrightness });
      } catch (e) {
        throw new Error("Failed increasing brightness");
      }
    }

    return newBrightness;
  }

  async decreaseBrightness() {
    let newBrightness;
    for (let x = 0; x < KeyLight.keyLights.length; x++) {
      try {
        const keyLight = await this.getKeyLight(KeyLight.keyLights[x].service);
        newBrightness = Math.min(keyLight.brightness - 5, 100);
        await this.updateKeyLight(KeyLight.keyLights[x].service, { brightness: newBrightness });
      } catch (e) {
        throw new Error("Failed increasing brightness");
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
        throw new Error("Failed decreasing temperature");
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
        throw new Error("Failed decreasing temperature");
      }
    }

    return newTemperature;
  }

  private async getKeyLight(service: RemoteService) {
    const url = `http://${service.referer.address}:${service.port}/elgato/lights`;
    const response = await axios.get(url);
    return response.data.lights[0];
  }

  private async updateKeyLight(
    service: RemoteService,
    options: { brightness?: number; temperature?: number; on?: boolean }
  ) {
    const url = `http://${service.referer.address}:${service.port}/elgato/lights`;
    await axios.put(url, {
      lights: [
        {
          ...options,
        },
      ],
    });
  }
}
