import { Device } from "../devices.model";
import { disconnectDevice } from "./disconnect-device";
import { connectDevice } from "./connect-device";
import { showAnimatedMessage, showWarningMessage } from "src/utils";

const RECONNECT_DELAY_MS = 2000;

export async function refreshDevice(device: Device): Promise<boolean> {
  const disconnected = await disconnectDevice(device);

  if (disconnected) {
    await showAnimatedMessage("Reconnecting...");
    await new Promise((resolve) => setTimeout(resolve, RECONNECT_DELAY_MS));
  } else {
    await showWarningMessage("Failed to disconnect. Reconnecting anyway…");
  }

  return connectDevice(device);
}
