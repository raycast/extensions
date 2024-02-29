import { showHUD } from "@raycast/api";
import { runYabaiCommand } from "./helpers/scripts";
import { showFailureToast } from "@raycast/utils";

export default async () => {
  let serviceRunning = false;

  try {
    const { stderr } = await runYabaiCommand("--stop-service");

    if (stderr) {
      throw new Error(stderr);
    }

    showHUD("Yabai has been stopped.");

    serviceRunning = false;
  } catch (error) {
    if (error instanceof Error && error.message.includes("Yabai executable not found")) {
      return;
    }

    if (String(error).includes("Could not find service")) {
      serviceRunning = true;
    } else {
      showFailureToast(error, {
        title: "Error stopping Yabai",
      });
    }
  }

  if (serviceRunning) {
    try {
      const { stderr } = await runYabaiCommand("--start-service");

      if (stderr) {
        throw new Error(stderr);
      }

      showHUD("Yabai has been started.");
    } catch (error) {
      if (error instanceof Error && error.message.includes("Yabai executable not found")) {
        return;
      }

      showFailureToast(error, {
        title: "Error starting Yabai",
      });
    }
  }
};
