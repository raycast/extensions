import { Clipboard, showHUD } from "@raycast/api";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { getCurrentlyPlaying } from "./api/getCurrentlyPlaying";
import { getEmbedCode } from "./helpers/getEmbedCode";

export default async function Command() {
  await setSpotifyClient();

  const currentlyPlayingData = await getCurrentlyPlaying();
  const nothingIsPlaying = !currentlyPlayingData || !currentlyPlayingData.item;

  if (nothingIsPlaying) {
    return await showHUD("Nothing is currently playing");
  }

  const external_urls = currentlyPlayingData.item.external_urls;
  const spotifyUrl = external_urls?.spotify;

  const embedCode = getEmbedCode(spotifyUrl);

  if (!embedCode) {
    return await showHUD("Nothing is currently playing");
  }

  await Clipboard.copy(embedCode);
  return showHUD("Copied embed code to clipboard");
}
