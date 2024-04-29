import { LaunchProps, LaunchType, Toast, showToast, updateCommandMetadata } from "@raycast/api";
import { SonosDevice } from "@svrooij/sonos/lib";
import { SonosState } from "@svrooij/sonos/lib/models/sonos-state";
import { formatPlayingState, getActiveCoordinator, getLatestState } from "./core/sonos";
import { handleCommandError, tryLaunchCommand } from "./core/utils";

export default async function Command({ launchType }: LaunchProps) {
  const userInitiated = launchType === LaunchType.UserInitiated;
  let state: SonosState | null = null;
  let coordinator: SonosDevice | undefined;

  try {
    state = await getLatestState();
    coordinator = await getActiveCoordinator();
  } catch (error) {
    const caught = await handleCommandError(error);

    if (caught || !userInitiated) {
      return;
    }
  }

  if (!coordinator && userInitiated) {
    await tryLaunchCommand({
      name: "set-group",
      type: LaunchType.UserInitiated,
      failureMessage: `Failed to launch "Set Active Group" automatically`,
    });
  } else {
    if (coordinator && userInitiated) {
      try {
        await coordinator.TogglePlayback();
      } catch (error) {
        await showToast({
          title: "Can't toggle playback in the current state",
          style: Toast.Style.Failure,
        });

        return;
      }
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
