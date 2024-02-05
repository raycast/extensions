import { LaunchType, launchCommand } from "@raycast/api";
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
  } else {
    await coordinator.SetRelativeGroupVolume(2);
  }
}
