import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { clockodo } from "./clockodo";

export default async function main() {
  try {
    const clock = await clockodo.getClock();

    if (clock.running) {
      await clockodo.stopClock({
        entriesId: clock.running.id,
      });
      await showHUD("Stopped clock");
    } else {
      await showHUD("No running clock found");
    }
  } catch (error) {
    await showFailureToast(error, { title: "Failed to stop clock" });
  }
}
