import { closeMainWindow, launchCommand, LaunchType, getPreferenceValues, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { pickAndHandleColor } from "./lib/pick-color";
import { PickColorCommandLaunchProps } from "./lib/types";
import { isMac } from "./lib/utils";

export default async function Command(props: PickColorCommandLaunchProps) {
  const { showColorName } = getPreferenceValues<Preferences.PickColor>();
  await closeMainWindow();

  try {
    const outcome = await pickAndHandleColor({ launchContext: props.launchContext, showColorName });
    if (outcome === "cancelled") return;

    if (isMac) {
      try {
        await launchCommand({ name: "menu-bar", type: LaunchType.Background });
      } catch (e) {
        // Refreshing the optional menu bar must not turn a successful pick into an error.
        console.warn("Could not refresh Menu Bar Color Picker", e);
      }
    }

    if (props.launchContext?.source === "organize-colors") {
      try {
        await launchCommand({ name: "organize-colors", type: LaunchType.UserInitiated });
      } catch (e) {
        await showFailureToast(e);
      }
    }
  } catch (e) {
    console.error(e);

    await showHUD("❌ Failed picking color");
  }
}
