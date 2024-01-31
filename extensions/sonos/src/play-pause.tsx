import { LaunchProps, LaunchType, launchCommand, showHUD, updateCommandMetadata } from "@raycast/api";
import { formatPlayingState, getLatestState, getActiveCoordinator } from "./core/sonos";

export default async function Command({ launchType }: LaunchProps) {
  const state = await getLatestState();
  const coordinator = await getActiveCoordinator();
  const userInitiated = launchType === LaunchType.UserInitiated;

  if (!coordinator && userInitiated) {
    await showHUD("Failed to resolve coordinator, choose an explicit group first");

    await launchCommand({
      name: "set-group",
      type: LaunchType.UserInitiated,
    });
  } else {
    if (coordinator && userInitiated) {
      await coordinator.TogglePlayback();
    }

    const title = await formatPlayingState(state);

    if (title !== null) {
      updateCommandMetadata({
        subtitle: title,
      });

      try {
        await launchCommand({
          name: "now-playing",
          type: LaunchType.Background,
        });
      } catch (error) {
        // This means the menu bar command hasn't been loaded yet. We just ignore that here.
      }
    }
  }
}
