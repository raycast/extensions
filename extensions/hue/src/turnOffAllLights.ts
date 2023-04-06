import { closeMainWindow, LocalStorage, showHUD } from "@raycast/api";
import { CouldNotConnectToHueBridgeError, NoHueBridgeConfiguredError } from "./lib/errors";
import { BRIDGE_ID, BRIDGE_IP_ADDRESS_KEY, BRIDGE_USERNAME_KEY } from "./lib/constants";
import HueClient from "./lib/HueClient";

export default async () => {
  closeMainWindow().then();

  await Promise.all([
    LocalStorage.getItem<string>(BRIDGE_IP_ADDRESS_KEY),
    LocalStorage.getItem<string>(BRIDGE_ID),
    LocalStorage.getItem<string>(BRIDGE_USERNAME_KEY),
  ])
    .then(async ([bridgeIpAddress, bridgeId, bridgeUsername]) => {
      if (bridgeIpAddress === undefined || bridgeId === undefined || bridgeUsername === undefined) {
        throw new NoHueBridgeConfiguredError();
      }

      const hueClient = await HueClient.createInstance(bridgeIpAddress, bridgeId, bridgeUsername);
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
