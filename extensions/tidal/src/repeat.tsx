import { showHUD } from "@raycast/api";
import { sendCommand, getCurrentTrack } from "./lib/utils";

export default async function RepeatCommand() {
  const track = await getCurrentTrack();

  const success = await sendCommand("toggleRepeat");
  if (success) {
    const currentMode = track?.repeatMode ?? "off";

    const nextModeMap: Record<string, string> = {
      off: "All",
      all: "One",
      one: "Off",
    };

    const status = nextModeMap[currentMode.toLowerCase()] || "Off";
    await showHUD(`🔁 Repeat: ${status}`);
  } else {
    await showHUD("❌ Failed to toggle repeat");
  }
}
