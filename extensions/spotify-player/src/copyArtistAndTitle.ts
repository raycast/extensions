import { showHUD, Clipboard } from "@raycast/api";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { getCurrentlyPlaying } from "./api/getCurrentlyPlaying";
import { TrackObject } from "./helpers/spotify.api";

export default async function Command() {
  await setSpotifyClient();

  const currentlyPlayingData = await getCurrentlyPlaying();
  const nothingIsPlaying = !currentlyPlayingData || !currentlyPlayingData?.item;

  if (nothingIsPlaying) {
    return await showHUD("Nothing is currently playing");
  }

  const { item } = currentlyPlayingData;

  const { artists } = item as TrackObject;
  const artistName = artists?.[0]?.name;
  const title = `${item.name} · ${artistName}`;

  await Clipboard.copy(title);
  return await showHUD("Copied artist and track title to clipboard");
}
