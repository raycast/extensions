import { LaunchProps, showHUD } from "@raycast/api";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { seek } from "./api/seek";
import { getCurrentlyPlaying } from "./api/getCurrentlyPlaying";

export default async function Command(props: LaunchProps<{ arguments: Arguments.Seek }>) {
  // position is a string, convert it to a number
  const difference = Number(props.arguments.difference);

  // make sure position is a valid number
  if (isNaN(difference)) {
    await showHUD("Seconds must be a number");
    return;
  }

  await setSpotifyClient();

  if (difference === 0) {
    await showHUD("No change in position");
    return;
  }

  const currentlyPlayingData = await getCurrentlyPlaying();

  const currentPosition = currentlyPlayingData?.progress_ms ?? 0;
  const newPosition = currentPosition / 1000 + difference;

  if (newPosition < 0) {
    await showHUD("Cannot seek before the start of the track");
    return;
  }

  try {
    const res = await seek(newPosition);

    if (res == "next") {
      await showHUD("Skipping to next track");
    } else if (res == "position") {
      if (difference > 0) {
        await showHUD(`Seeked forward ${difference}s`);
      } else {
        await showHUD(`Seeked backward ${-difference}s`);
      }
    } else {
      await showHUD("No active device");
    }
  } catch (error) {
    await showHUD("No active device");
  }
}
