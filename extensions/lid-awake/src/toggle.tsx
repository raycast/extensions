import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { disable, durationLabel, enable, getDefaultMinutes } from "./lib/session";
import { isSleepDisabled } from "./lib/system";

export default async function Command() {
  try {
    if (await isSleepDisabled()) {
      await disable();
      await showHUD("Lid Awake off");
    } else {
      const minutes = getDefaultMinutes();
      await enable(minutes);
      await showHUD(
        minutes === null
          ? "Lid Awake on until you turn it off"
          : `Lid Awake on for ${durationLabel(minutes).toLowerCase()}`,
      );
    }
  } catch (error) {
    await showFailureToast(error, { title: "Could not toggle Lid Awake" });
  }
}
