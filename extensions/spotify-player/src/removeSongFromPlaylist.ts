import { Alert, Icon, confirmAlert, showHUD } from "@raycast/api";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { getCurrentlyPlaying } from "./api/getCurrentlyPlaying";
import { removeFromPlaylist } from "./api/removeFromPlaylist";
import { showFailureToast } from "@raycast/utils";
import { skipToNext } from "./api/skipToNext";

export default async function Command() {
  await setSpotifyClient();

  const currentlyPlayingData = await getCurrentlyPlaying();
  const nothingIsPlaying = !currentlyPlayingData || !currentlyPlayingData.item;
  const isTrack = currentlyPlayingData?.currently_playing_type !== "episode";
  const trackUri = currentlyPlayingData?.item?.uri;
  const playlistId = (currentlyPlayingData?.context?.uri ?? "").split(":")[2];

  if (nothingIsPlaying) {
    return await showHUD("Nothing is currently playing");
  }

  if (!isTrack) {
    return await showHUD("Removing episodes is not supported yet");
  }

  if (trackUri === undefined) {
    return await showHUD("Unable to retrieve the track ID");
  }

  if (!playlistId) {
    return await showHUD("Unable to retrieve the playlist ID");
  }

  const confirmedAlert = await confirmAlert({
    title: "Remove Song",
    message:
      "Are you sure you want to remove the currently playing song from the playlist?\n\nThis removes every instance of the song from the playlist.",
    icon: Icon.Trash,
    primaryAction: {
      title: "Remove",
      style: Alert.ActionStyle.Destructive,
    },
  });

  if (!confirmedAlert) {
    return;
  }

  try {
    await removeFromPlaylist({ playlistId, trackUris: [{ uri: trackUri }] });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error removing song from playlist. Please try again.";
    showFailureToast(errorMessage);
    return;
  }

  const shouldSkipSong = await confirmAlert({
    title: "Skip Song",
    message: `Song '${currentlyPlayingData.item.name}' has been removed from the playlist. Do you want to skip to the next song?`,
    icon: Icon.Forward,
    primaryAction: {
      title: "Skip",
      style: Alert.ActionStyle.Default,
    },
  });

  if (!shouldSkipSong) {
    return;
  }

  try {
    await skipToNext();
    await showHUD("Skipped to next");
  } catch (error) {
    await showHUD("Nothing is currently playing");
  }
}
