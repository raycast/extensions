import { LaunchProps, showHUD } from "@raycast/api";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { changeVolume } from "./api/changeVolume";

export default async function Command(props: LaunchProps<{ arguments: Arguments.Volume }>) {
  // volume is a string
  const volume = Number(props.arguments.volume);

  // make sure volume is a valid number
  if (isNaN(volume)) {
    await showHUD("Volume must be a number");
    return;
  }

  // make sure volume is between 0 and 100 inclusive
  if (volume < 0 || volume > 100) {
    await showHUD("Volume must be between 0 and 100");
    return;
  }

  await setSpotifyClient();

  try {
    await changeVolume(volume);
    await showHUD(`Volume set to ${volume}%`);
  } catch {
    await showHUD("No active device");
  }
}
