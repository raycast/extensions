import { LaunchType, Toast, launchCommand, showToast } from "@raycast/api";
import { getActiveCoordinator } from "./core/sonos";

export default async function Command() {
  const coordinator = await getActiveCoordinator();

  if (coordinator === undefined) {
    await launchCommand({
      name: "set-group",
      type: LaunchType.UserInitiated,
    });
  } else {
    try {
      await coordinator.Previous();
    } catch (error) {
      await showToast({
        title: "The current media cannot be skipped",
        style: Toast.Style.Failure,
      });
    }
  }
}
