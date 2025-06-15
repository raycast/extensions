import { showHUD } from "@raycast/api";
import { runYabaiCommand } from "./helpers/scripts";
import { showFailureToast } from "@raycast/utils";

export default async function Command() {
  try {
    const { stderr } = await runYabaiCommand("--restart-service");

    if (stderr) {
      throw new Error(stderr);
    }

    showHUD("Restarted yabai service");
  } catch (error) {
    try {
      const { stderr: startStderr } = await runYabaiCommand("--start-service");

      if (startStderr) {
        throw new Error(startStderr);
      }

      showHUD("Yabai was not running. Started yabai service");
    } catch (startError) {
      if (startError instanceof Error && startError.message.includes("Yabai executable not found")) {
        return;
      }

      showFailureToast(startError, {
        title: "Failed to start yabai service, make sure you have Yabai installed.",
      });
    }
  }
}
