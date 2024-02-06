import { LaunchProps, LaunchType, launchCommand, showHUD, updateCommandMetadata } from "@raycast/api";
import { formatPlayingState, getLatestState, getActiveCoordinator } from "./core/sonos";
import { SonosDevice } from "@svrooij/sonos/lib";
import { SonosState } from "@svrooij/sonos/lib/models/sonos-state";
import { handleCommandError, tryLaunchCommand } from "./core/utils";

export default async function Command({ launchType }: LaunchProps) {
  const userInitiated = launchType === LaunchType.UserInitiated;
  let state: SonosState | null;
  let coordinator: SonosDevice | undefined;

  try {
    state = await getLatestState();
    coordinator = await getActiveCoordinator();
  } catch (error) {
    await handleCommandError(error);
    return;
  }

  if (!coordinator && userInitiated) {
    await tryLaunchCommand({
      name: "set-group",
      type: LaunchType.UserInitiated,
      failureMessage: `Failed to launch "Set Active Group" automatically`,
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

      await tryLaunchCommand({
        name: "now-playing",
        type: LaunchType.Background,
      });
    }
  }
}
