import { showHUD } from "@raycast/api";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { seek } from "./api/seek";

export default async function Command() {
  await setSpotifyClient();

  try {
    await seek(0);
    await showHUD("Replaying");
  } catch {
    await showHUD("No active device");
  }
}
