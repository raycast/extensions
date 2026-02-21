import { showHUD } from "@raycast/api";
import { stopPlayback } from "./lib/control";

export default async function Command() {
  try {
    await stopPlayback();
    await showHUD("Playback stopped");
  } catch (error) {
    await showHUD("Failed to stop playback");
  }
}
