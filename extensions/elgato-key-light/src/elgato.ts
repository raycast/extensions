import axios from "axios";
import Bonjour, { RemoteService } from "bonjour";
import { waitUntil } from "./utils";

const WARM_TEMPERATURE = 344; // 2900k
const COLD_TEMPERATURE = 143; // 7000k
const TEMPERATURE_STEP = (WARM_TEMPERATURE - COLD_TEMPERATURE) / 20; // 5%

export class KeyLight {
  static async discover() {
    const bonjour = Bonjour();

    const find = new Promise<KeyLight>((resolve) => {
      bonjour.findOne({ type: "elg" }, (service) => {
        const keyLight = new KeyLight(service);
        resolve(keyLight);
        bonjour.destroy();
      });
    });

    return waitUntil(find, { timeoutMessage: "Cannot discover any Key Lights in the network" });
  }

  private service: RemoteService;

  private constructor(service: RemoteService) {
    this.service = service;
  }

  async toggle() {
    try {
      const keyLight = await this.getKeyLight(this.service);
      const newState = !keyLight.on;
      await this.updateKeyLight(this.service, { on: newState });
      return newState;
    } catch (e) {
      throw new Error("Failed toggling Key Light");
    }
  }

  async increaseBrightness() {
    try {
      const keyLight = await this.getKeyLight(this.service);
      const newBrightness = Math.min(keyLight.brightness + 5, 100);
      await this.updateKeyLight(this.service, { brightness: newBrightness });
      return newBrightness;
    } catch (e) {
      throw new Error("Failed increasing brightness");
    }
  }

  async decreaseBrightness() {
    try {
      const keyLight = await this.getKeyLight(this.service);
      const newBrightness = Math.max(keyLight.brightness - 5, 0);
      await this.updateKeyLight(this.service, { brightness: newBrightness });
      return newBrightness;
    } catch (e) {
      throw new Error("Failed decreasing brightness");
    }
  }

  async increaseTemperature() {
    try {
      const keyLight = await this.getKeyLight(this.service);
      const newTemperature = Math.min(keyLight.temperature + TEMPERATURE_STEP, WARM_TEMPERATURE);
      await this.updateKeyLight(this.service, { temperature: newTemperature });
    } catch (e) {
      throw new Error("Failed increasing temperature");
    }
  }

  async decreaseTemperature() {
    try {
      const keyLight = await this.getKeyLight(this.service);
      const newTemperature = Math.max(keyLight.temperature - TEMPERATURE_STEP, COLD_TEMPERATURE);
      await this.updateKeyLight(this.service, { temperature: newTemperature });
    } catch (e) {
      throw new Error("Failed decreasing temperature");
    }
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
