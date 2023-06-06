import { closeMainWindow, LocalStorage, showHUD, Toast } from "@raycast/api";
import { BRIDGE_CONFIG_KEY } from "./helpers/constants";
import { BridgeConfig } from "./lib/types";
import createHueClient from "./lib/createHueClient";

export default async () => {
  new Toast({
    style: Toast.Style.Animated,
    title: "Turning off all lights",
    message: "Please wait…",
  })
    .show()
    .then();

  await LocalStorage.getItem<string>(BRIDGE_CONFIG_KEY)
    .then((bridgeConfigString) => {
      if (bridgeConfigString === undefined) return Promise.reject("No Hue Bridge configured");
      return JSON.parse(bridgeConfigString);
    })
    .then((bridgeConfig: BridgeConfig) => createHueClient(bridgeConfig))
    .then(async (hueClient) => ({
      hueClient,
      lights: await hueClient.getLights(),
    }))
    .then(({ hueClient, lights }) => {
      const onLights = lights.filter((light) => light.on.on);

      if (onLights.length === 0) {
        closeMainWindow();
        return Promise.reject("All lights are already off");
      }

      const promises = onLights
        .filter((light) => light.on.on)
        .map((light) => hueClient.updateLight(light, { on: { on: false } }));

      return Promise.allSettled(promises);
    })
    .then((settledPromises) => {
      const lightsTurnedOff = settledPromises.filter((settledPromise) => settledPromise.status === "fulfilled");
      const lightsFailedToTurnOff = settledPromises.filter((settledPromise) => settledPromise.status === "rejected");

      closeMainWindow();

      if (lightsTurnedOff.length === 0 && lightsFailedToTurnOff.length > 0) {
        return showHUD(`Failed turning off all ${lightsFailedToTurnOff.length} lights that were on.`);
      }

      if (lightsFailedToTurnOff.length > 0) {
        showHUD(
          `Turned off ${lightsTurnedOff.length} lights, failed turning off ${lightsFailedToTurnOff.length} lights.`
        );
      }

      showHUD(`Turned off all ${settledPromises.length} lights that were on.`);
    })
    .catch((error) => {
      closeMainWindow();
      showHUD(error?.toString());
    });
};
