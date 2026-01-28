import { LaunchType, Toast, showToast } from "@raycast/api";
import { SonosDevice } from "@svrooij/sonos/lib";
import { getActiveCoordinator } from "./core/sonos";
import { handleCommandError, tryLaunchCommand } from "./core/utils";

export default async function Command() {
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
    try {
      await coordinator.Next();
    } catch (error) {
      await showToast({
        title: "The current media cannot be skipped",
        style: Toast.Style.Failure,
      });
    }
  }
}
