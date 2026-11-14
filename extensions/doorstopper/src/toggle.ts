import { showHUD } from "@raycast/api";
import { disable, enable, getDefaultMinutes } from "./lib/session";
import { turnOnMessage } from "./lib/labels";
import { showCommandFailure } from "./lib/feedback";
import { isSleepDisabled } from "./lib/system";

export default async function main() {
  try {
    if (await isSleepDisabled()) {
      await disable();
      await showHUD("Doorstopper is now disabled");
    } else {
      const minutes = getDefaultMinutes();
      await enable(minutes);
      await showHUD(turnOnMessage(minutes));
    }
  } catch (error) {
    await showCommandFailure(error, "Failed to toggle Doorstopper");
  }
}
