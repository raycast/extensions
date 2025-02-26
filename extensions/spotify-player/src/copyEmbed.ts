import { Clipboard, showHUD } from "@raycast/api";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { getCurrentlyPlaying } from "./api/getCurrentlyPlaying";

export default async function Command() {
  await setSpotifyClient();

  const currentlyPlayingData = await getCurrentlyPlaying();
  const nothingIsPlaying = !currentlyPlayingData || !currentlyPlayingData.item;

  if (nothingIsPlaying) {
    return await showHUD("Nothing is currently playing");
  }

  const external_urls = currentlyPlayingData.item.external_urls;
  const spotifyUrl = external_urls?.spotify;

  const embedUrl = spotifyUrl?.replace("open.spotify.com/", "open.spotify.com/embed/");

  const embedCode = `<iframe style="border-radius:12px" src="${embedUrl}?utm_source=generator" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;

  await Clipboard.copy(embedCode);
  return showHUD("Copied embed code to clipboard");
}
