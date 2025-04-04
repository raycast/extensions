import { showHUD } from "@raycast/api";
import { getHandoffStatus } from "./utils";

export default async function main(): Promise<void> {
  try {
    const isEnabled = getHandoffStatus();
    await showHUD(`Handoff is currently ${isEnabled ? "Enabled" : "Disabled"}`);
  } catch (error) {
    console.error("Error:", error);
    await showHUD("Failed to check Handoff status");
  }
}
