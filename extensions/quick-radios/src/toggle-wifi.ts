import { showHUD } from "@raycast/api";
import { toggleWifi } from "./services/wifiService";

export default async function Command() {
  try {
    const newState = await toggleWifi();
    await showHUD(`📶 Wi-Fi turned ${newState ? "ON" : "OFF"}`);
  } catch (error) {
    await showHUD(
      `❌ Failed to toggle Wi-Fi: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
