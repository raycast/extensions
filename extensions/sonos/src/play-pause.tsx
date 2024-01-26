import { LaunchProps, updateCommandMetadata } from "@raycast/api";
import { getActiveCoordinator, isPlaying, formatPlayingState } from "./sonos";

export default async function Command({ launchType }: LaunchProps) {
  const coordinator = await getActiveCoordinator();

  if (coordinator === undefined) {
    return null;
  }

  const playing = await isPlaying(coordinator);
  const state = await coordinator.GetState();

  if (launchType === "background") {
    const subtitle = formatPlayingState({
      playing,
      state,
    });

    updateCommandMetadata({
      subtitle,
    });
  } else if (launchType === "userInitiated") {
    await coordinator.TogglePlayback();

    updateCommandMetadata({
      subtitle: formatPlayingState({
        playing: !playing,
        state,
      }),
    });
  }
}
