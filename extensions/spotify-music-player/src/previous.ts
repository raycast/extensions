import { showHUD } from "@raycast/api";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { skipToPrevious } from "./api/skipToPrevious";
import { getUserFriendlyErrorMessage } from "./helpers/getError";

export default async function Command() {
  await setSpotifyClient();

  try {
    await skipToPrevious();
    await showHUD("⏮ Previous track");
  } catch (err) {
    const message = getUserFriendlyErrorMessage(err);
    await showHUD(`❌ ${message}`);
  }
}
