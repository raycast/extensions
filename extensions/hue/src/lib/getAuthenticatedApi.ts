import { Api } from "node-hue-api/dist/esm/api/Api";
import { LocalStorage } from "@raycast/api";
import { BRIDGE_IP_ADDRESS_KEY, BRIDGE_USERNAME_KEY } from "./constants";
import { CouldNotConnectToHueBridgeError, NoHueBridgeConfiguredError } from "./errors";
import { v3 } from "node-hue-api";

export default async function getAuthenticatedApi(): Promise<Api> {
  const bridgeIpAddress = await LocalStorage.getItem<string>(BRIDGE_IP_ADDRESS_KEY);
  const bridgeUsername = await LocalStorage.getItem<string>(BRIDGE_USERNAME_KEY);

  if (!bridgeIpAddress || !bridgeUsername) throw new NoHueBridgeConfiguredError();

  try {
    return v3.api.createLocal(bridgeIpAddress).connect(bridgeUsername);
  } catch (error) {
    throw new CouldNotConnectToHueBridgeError();
  }
}
