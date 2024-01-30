import { LaunchProps, LaunchType, launchCommand, updateCommandMetadata } from "@raycast/api";
import { formatPlayingState, getLatestState, getActiveCoordinator } from "./core/sonos";

export default async function Command({ launchType }: LaunchProps) {
  const state = await getLatestState();
  const coordinator = await getActiveCoordinator();

  if (coordinator === undefined) {
    await launchCommand({
      name: "set-group",
      type: LaunchType.UserInitiated,
    });
  } else {
    const title = await formatPlayingState(state);

    if (title !== null) {
      updateCommandMetadata({
        subtitle: title,
      });
    }

    if (launchType === LaunchType.UserInitiated) {
      await coordinator.TogglePlayback();
    }
  }
}
