import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { disable, enable, getDefaultMinutes } from "./lib/session";
import { turnOnMessage } from "./lib/labels";
import { isSleepDisabled } from "./lib/system";

export default async function Command() {
  try {
    if (await isSleepDisabled()) {
      await disable();
      await showHUD("Lid Awake off");
    } else {
      const minutes = getDefaultMinutes();
      await enable(minutes);
      await showHUD(turnOnMessage(minutes));
    }
  } catch (error) {
    await showFailureToast(error, { title: "Could not toggle Lid Awake" });
  }
}
