import { closeMainWindow, LocalStorage, showHUD } from "@raycast/api";
import { CouldNotConnectToHueBridgeError, NoHueBridgeConfiguredError } from "./lib/errors";
import HueClient from "./lib/HueClient";
import { BRIDGE_CONFIG_KEY } from "./lib/constants";
import { BridgeConfig } from "./lib/types";

export default async () => {
  closeMainWindow().then();

  LocalStorage.getItem<string>(BRIDGE_CONFIG_KEY)
    .then((bridgeConfigString) => {
      if (bridgeConfigString === undefined) throw new NoHueBridgeConfiguredError();
      return JSON.parse(bridgeConfigString);
    })
    .then(async (bridgeConfig: BridgeConfig) => {
      const hueClient = await HueClient.createInstance(bridgeConfig);
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
    .catch((error) => {
      if (error instanceof NoHueBridgeConfiguredError) return showHUD("No Hue bridge configured");
      if (error instanceof CouldNotConnectToHueBridgeError) return showHUD("Could not connect to the Hue bridge");
      return showHUD("Failed turning off all lights");
    });
};
