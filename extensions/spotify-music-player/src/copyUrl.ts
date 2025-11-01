import { showHUD, Clipboard } from "@raycast/api";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { getCurrentlyPlaying } from "./api/getCurrentlyPlaying";
import { getUserFriendlyErrorMessage } from "./helpers/getError";

export default async function Command() {
  await setSpotifyClient();

  try {
    const currentlyPlayingData = await getCurrentlyPlaying();
    const nothingIsPlaying = !currentlyPlayingData || !currentlyPlayingData?.item;

    if (nothingIsPlaying) {
      return await showHUD("❌ Nothing is currently playing");
    }

    const external_urls = currentlyPlayingData.item.external_urls;
    const title = currentlyPlayingData.item.name;

    await Clipboard.copy({
      html: `<a href=${external_urls?.spotify}>${title}</a>`,
      text: external_urls?.spotify,
    });

    return await showHUD("📋 URL copied to clipboard");
  } catch (err) {
    const message = getUserFriendlyErrorMessage(err);
    await showHUD(`❌ ${message}`);
  }
}
