import { showHUD } from "@raycast/api";
import { toggleBluetooth } from "./services/bluetoothService";

export default async function Command() {
  try {
    const newState = await toggleBluetooth();
    await showHUD(`ᛒ Bluetooth turned ${newState ? "ON" : "OFF"}`);
  } catch (error) {
    await showHUD(
      `❌ Failed to toggle Bluetooth: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
