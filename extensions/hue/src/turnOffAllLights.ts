import { closeMainWindow, LocalStorage, showHUD } from "@raycast/api";
import { CouldNotConnectToHueBridgeError, NoHueBridgeConfiguredError } from "./lib/errors";
import { BRIDGE_ID, BRIDGE_IP_ADDRESS_KEY, BRIDGE_USERNAME_KEY } from "./lib/constants";
import HueClient from "./lib/HueClient";

export default async () => {
  await closeMainWindow();

  try {
    const [bridgeIpAddress, bridgeId, bridgeUsername] = await Promise.all([
      LocalStorage.getItem<string>(BRIDGE_IP_ADDRESS_KEY),
      LocalStorage.getItem<string>(BRIDGE_ID),
      LocalStorage.getItem<string>(BRIDGE_USERNAME_KEY),
    ]);

    if (bridgeIpAddress === undefined || bridgeId === undefined || bridgeUsername === undefined) {
      throw Error("No Hue Bridge credentials found");
    }

    const hueClient = await HueClient.createInstance(bridgeIpAddress, bridgeId, bridgeUsername);
    const lights = await hueClient.getLights();
    lights.forEach((light) => {
      hueClient.updateLight(light, { on: { on: false } });
    });

    await showHUD("Turned off all lights");
  } catch (error) {
    if (error instanceof NoHueBridgeConfiguredError) return showHUD("No Hue bridge configured");
    if (error instanceof CouldNotConnectToHueBridgeError) return showHUD("Could not connect to the Hue bridge");
    return showHUD("Failed turning off all lights");
  }
};
