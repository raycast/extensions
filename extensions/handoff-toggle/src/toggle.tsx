import { showHUD } from "@raycast/api";
import { getHandoffStatus, setHandoffStatus } from "./utils";

export default async function main(): Promise<void> {
  try {
    const isEnabled = getHandoffStatus();
    setHandoffStatus(!isEnabled);
    await showHUD(`Handoff ${!isEnabled ? "Enabled" : "Disabled"}`);
  } catch (error) {
    console.error("Error:", error);
    await showHUD("Failed to toggle Handoff");
  }
}
