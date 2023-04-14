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
  await LocalStorage.getItem<string>(BRIDGE_CONFIG_KEY)
    .then((bridgeConfigString) => {
      if (bridgeConfigString === undefined) throw new NoHueBridgeConfiguredError();
      return JSON.parse(bridgeConfigString);
    })
    .then((bridgeConfig: BridgeConfig) => createHueClient(bridgeConfig))
    .then(async (hueClient) => ({
      hueClient,
      lights: await hueClient.getLights(),
    }))
    .then(({ hueClient, lights }) => {
      const promises = lights
        .filter((light) => light.on.on)
        .map((light) => hueClient.updateLight(light, { on: { on: false } }));

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
