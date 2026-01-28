import { showHUD } from "@raycast/api";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { seek } from "./api/seek";
import { WinNotSupportedError } from "./helpers/script";

export default async function Command() {
  await setSpotifyClient();

  try {
    await seek(0);
    await showHUD("Replaying");
  } catch (error) {
    await showHUD(error instanceof WinNotSupportedError ? error.message : "No active device");
  }
}
