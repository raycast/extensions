import { showHUD } from "@raycast/api";
import { playpause, getPlayerStatus } from "./helpers/swinsian";

export default async function TogglePlayPause() {
  const status = await getPlayerStatus();
  if (status.state === "stopped") {
    await showHUD("Swinsian is not playing anything");
    return;
  }
  await playpause();
  const next = status.state === "playing" ? "Paused" : "Playing";
  await showHUD(next);
}
