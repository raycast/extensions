import { type LaunchProps, LaunchType, launchCommand } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { updateCurrentCommandSubtitle } from "./lib/subtitle";

export default async function Command(props: LaunchProps) {
  try {
    await updateCurrentCommandSubtitle();
  } catch (err) {
    await showFailureToast(
      `Failed to update subtitle: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (props.launchType === LaunchType.UserInitiated) {
    try {
      await launchCommand({
        name: "calculate-leave-time-view",
        type: LaunchType.UserInitiated,
      });
    } catch (err) {
      await showFailureToast(
        `Failed to open view: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
