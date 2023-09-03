import { LaunchProps, showHUD } from "@raycast/api";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { seek } from "./api/seek";

export default async function Command(props: LaunchProps<{ arguments: Arguments.Seek }>) {
  // volume is a string
  const position = Number(props.arguments.position);

  // make sure position is a valid number
  if (isNaN(position)) {
    await showHUD("Position must be a number");
    return;
  }

  // make sure volume is greater than 100
  if (position < 0) {
    await showHUD("Position must be between 0 and 100");
    return;
  }

  await setSpotifyClient();

  try {
    let res = await seek(position);
    if (res == "next") {
      await showHUD("Skipping to next track");
    } else if (res == "position") {
      await showHUD(`Position set to ${position}s`);
    } else {
      await showHUD("No active device");
    }
  } catch (error) {
    await showHUD("No active device");
  }
}
