import { showHUD } from "@raycast/api";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { changeVolume } from "./api/changeVolume";

export default async function Command() {
  await setSpotifyClient();

  try {
    await changeVolume(0);
    await showHUD("Volume set to 0%");
  } catch {
    await showHUD("No active device");
  }
}
