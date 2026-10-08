import { showHUD } from "@raycast/api";
import { sendCommand } from "./lib/utils";

export default async function PreviousCommand() {
  const success = await sendCommand("previous");
  if (success) {
    await showHUD("⏮️ Previous track");
  } else {
    await showHUD("❌ Failed to skip to previous track");
  }
}
