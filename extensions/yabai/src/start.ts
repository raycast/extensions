import { showHUD } from "@raycast/api";
import { runYabaiCommand } from "./helpers/scripts";
import { showFailureToast } from "@raycast/utils";

export default async function Command() {
  try {
    const { stderr } = await runYabaiCommand("--start-service");

    if (stderr) {
      throw new Error();
    }

    showHUD("Started yabai service");
  } catch (error) {
    if (error instanceof Error && error.message.includes("Yabai executable not found")) {
      return;
    }

    showFailureToast(error, {
      title: "Failed to start yabai service, make sure you have Yabai installed.",
    });
  }
}
