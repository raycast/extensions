import { showHUD } from "@raycast/api";
import { runYabaiCommand } from "./helpers/scripts";
import { showFailureToast } from "@raycast/utils";

export default async function Command() {
  try {
    const { stderr } = await runYabaiCommand("--stop-service");

    if (stderr) {
      throw new Error();
    }

    showHUD("Stopped yabai service");
  } catch (error) {
    if (error instanceof Error && error.message.includes("Yabai executable not found")) {
      return;
    }

    showFailureToast(error, {
      title: "Failed to stop yabai service, make sure you have Yabai installed and running.",
    });
  }
}
