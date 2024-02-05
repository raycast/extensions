import { LaunchType, Toast, launchCommand, showToast } from "@raycast/api";
import { getActiveCoordinator } from "./core/sonos";
import { SonosDevice } from "@svrooij/sonos/lib";
import { handleCommandError } from "./core/utils";

export default async function Command() {
  let coordinator: SonosDevice | undefined;

  try {
    coordinator = await getActiveCoordinator();
  } catch (error) {
    await handleCommandError(error);
    return;
  }

  if (coordinator === undefined) {
    await launchCommand({
      name: "set-group",
      type: LaunchType.UserInitiated,
    });

    return;
  }

  try {
    await coordinator.Previous();
  } catch (error) {
    await showToast({
      title: "The current media cannot be skipped",
      style: Toast.Style.Failure,
    });
  }
}
