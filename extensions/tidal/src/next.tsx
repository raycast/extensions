import { showHUD } from "@raycast/api";
import { sendCommand } from "./lib/utils";

export default async function NextCommand() {
  const success = await sendCommand("next");
  if (success) {
    await showHUD("⏭️ Next track");
  } else {
    await showHUD("❌ Failed to skip to next track");
  }
}
