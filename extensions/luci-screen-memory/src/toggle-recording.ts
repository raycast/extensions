import { showHUD } from "@raycast/api";
import { toggleLuciRecording } from "./luci";

export default async function Command() {
  const result = await toggleLuciRecording();

  if (!result.success) {
    await showHUD(`⚠️ ${result.error}`);
    return;
  }

  if (result.recording) {
    await showHUD("Luci Screen Memory: Recording 🔴");
  } else {
    await showHUD("Luci Screen Memory: Paused ⏸️");
  }
}
