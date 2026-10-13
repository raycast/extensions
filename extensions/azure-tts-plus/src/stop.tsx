import { showHUD } from "@raycast/api";
import { isSpeaking, readLiveStatus, sendControl } from "./lib/state.js";

export default async function Stop() {
  if (!isSpeaking(readLiveStatus())) {
    await showHUD("Nothing is being read");
    return;
  }
  sendControl("stop");
  await showHUD("Stopped");
}
