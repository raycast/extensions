import { LaunchType, launchCommand } from "@raycast/api";
import { getActiveCoordinator } from "./core/sonos";

export default async function Command() {
  const coordinator = await getActiveCoordinator();

  if (coordinator === undefined) {
    await launchCommand({
      name: "set-group",
      type: LaunchType.UserInitiated,
    });
  } else {
    await coordinator.SetRelativeGroupVolume(2);
  }
}
