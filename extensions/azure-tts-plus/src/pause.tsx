import { showHUD } from "@raycast/api";
import { readLiveStatus, sendControl } from "./lib/state.js";

export default async function PauseOrResume() {
  const status = readLiveStatus();
  if (!status || status.state === "idle") {
    await showHUD("Nothing is being read");
    return;
  }
  sendControl("toggle-pause");
  await showHUD(status.state === "paused" ? "Resumed" : "Paused");
}
