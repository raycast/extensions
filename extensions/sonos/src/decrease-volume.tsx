import { LaunchType, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { SonosDevice } from "@svrooij/sonos/lib";
import { getActiveCoordinator } from "./core/sonos";
import { handleCommandError, tryLaunchCommand } from "./core/utils";

interface Preferences {
  volumeStep: string;
}

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();

  let coordinator: SonosDevice | undefined;

  try {
    coordinator = await getActiveCoordinator();
  } catch (error) {
    const caught = await handleCommandError(error);

    if (caught) {
      return;
    }
  }

  if (coordinator === undefined) {
    await tryLaunchCommand({
      name: "set-group",
      type: LaunchType.UserInitiated,
      failureMessage: `Failed to launch "Set Active Group" automatically`,
    });
  } else {
    const volume = await coordinator.SetRelativeGroupVolume(-Number(preferences.volumeStep));
    await showToast({
      style: Toast.Style.Success,
      title: `Decreased volume to ${volume}%.`,
    });
  }
}
