import { showHUD } from "@raycast/api";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { skipToNext } from "./api/skipToNext";
import { getUserFriendlyErrorMessage } from "./helpers/getError";

export default async function Command() {
  await setSpotifyClient();

  try {
    await skipToNext();
    await showHUD("⏭ Next track");
  } catch (err) {
    const message = getUserFriendlyErrorMessage(err);
    await showHUD(`❌ ${message}`);
  }
}
