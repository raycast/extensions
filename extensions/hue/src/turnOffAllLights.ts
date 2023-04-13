import { closeMainWindow, LocalStorage, showHUD } from "@raycast/api";
import { BRIDGE_CONFIG_KEY } from "./helpers/constants";
import { BridgeConfig } from "./lib/types";
import createHueClient from "./lib/createHueClient";

class NoHueBridgeConfiguredError extends Error {
  constructor() {
    super("No Hue Bridge configured");
  }
}

class CouldNotConnectToHueBridgeError extends Error {
  constructor() {
    super("Hue Bridge not found");
  }
}

export default async () => {
  LocalStorage.getItem<string>(BRIDGE_CONFIG_KEY)
    .then((bridgeConfigString) => {
      if (bridgeConfigString === undefined) throw new NoHueBridgeConfiguredError();
      return JSON.parse(bridgeConfigString);
    })
    .then(async (bridgeConfig: BridgeConfig) => {
      const hueClient = await createHueClient(bridgeConfig);
      return hueClient.getLights().then((lights) => ({ hueClient, lights }));
    })
    .then(({ hueClient, lights }) => {
      const promises = lights.map((light) => {
        return hueClient.updateLight(light, { on: { on: false } });
      });

      return Promise.all(promises);
    })
    .then(() => {
      return showHUD("Turned off all lights");
    })
    .then(() => closeMainWindow())
    .then(() => showHUD("Turned off all lights"))
    .catch((error) => {
      closeMainWindow().then(() => {
        if (error instanceof NoHueBridgeConfiguredError) return showHUD("No Hue bridge configured");
        if (error instanceof CouldNotConnectToHueBridgeError) return showHUD("Could not connect to the Hue bridge");
        return showHUD("Failed turning off all lights");
      });
    });
};
