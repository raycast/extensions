import { Alert, Icon, Toast, confirmAlert, showToast } from "@raycast/api";
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
    return showToast({ style: Toast.Style.Failure, title: "Nothing is currently playing" });
  }

  if (!isTrack) {
    return showToast({ style: Toast.Style.Failure, title: "Removing episodes is not supported yet" });
  }

  if (trackUri === undefined) {
    return showToast({ style: Toast.Style.Failure, title: "Unable to find track" });
  }

  if (!playlistId) {
    return showToast({ style: Toast.Style.Failure, title: "Unable to find the playlist" });
  }

  if (
    await confirmAlert({
      title: "Remove Song",
      message:
        "Are you sure you want to remove the current playing song from the playlist? This will delete every instance of the song.",
      icon: Icon.Trash,
      rememberUserChoice: true,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    })
  ) {
    try {
      await removeFromPlaylist({ playlistId, trackUris: [{ uri: trackUri }] });

      if (
        await confirmAlert({
          title: "Skip Song",
          message: `"${currentlyPlayingData.item.name}" has been removed from the playlist. Do you want to skip to the next song?`,
          icon: Icon.Forward,
          primaryAction: {
            title: "Skip",
          },
        })
      ) {
        try {
          await skipToNext();
          await showToast({ style: Toast.Style.Success, title: "Skipped to next" });
        } catch {
          await showToast({ style: Toast.Style.Failure, title: "Could not skip to next song" });
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error removing song from playlist. Please try again.";
      showFailureToast(errorMessage);
      return;
    }
  }
}
