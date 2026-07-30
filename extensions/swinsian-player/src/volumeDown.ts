import { showHUD } from "@raycast/api";
import { adjustVolume, getPlayerStatus } from "./helpers/swinsian";

export default async function VolumeDown() {
  await adjustVolume(-10);
  const status = await getPlayerStatus();
  await showHUD(`🔉 Volume: ${Math.round(status.volume)}%`);
}
