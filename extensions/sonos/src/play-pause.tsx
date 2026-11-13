import { LaunchProps, LaunchType, Toast, showToast } from "@raycast/api";
import { SonosDevice } from "@svrooij/sonos/lib";
import { getActiveCoordinator } from "./core/sonos";
import { handleCommandError, tryLaunchCommand } from "./core/utils";

export default async function Command({ launchType }: LaunchProps) {
  const userInitiated = launchType === LaunchType.UserInitiated;
  let coordinator: SonosDevice | undefined;

  try {
    coordinator = await getActiveCoordinator();
  } catch (error) {
    const caught = await handleCommandError(error);

    if (caught || !userInitiated) {
      return;
    }
  }

  if (coordinator && userInitiated) {
    try {
      await coordinator.TogglePlayback();
    } catch (error) {
      await showToast({
        title: "Can't toggle playback in the current state",
        style: Toast.Style.Failure,
      });
    }
  }

  // Keep the menu bar in sync after toggling.
  await tryLaunchCommand({
    name: "now-playing",
    type: LaunchType.Background,
  });
}
