import { showHUD } from "@raycast/api";
import { runYabaiCommand } from "./helpers/scripts";
import { showFailureToast } from "@raycast/utils";

export default async () => {
  let serviceRunning = false;

  try {
    await runYabaiCommand("--stop-service");
    showHUD("Yabai has been stopped.");

    serviceRunning = false;
  } catch (error) {
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
      await runYabaiCommand("--start-service");
      showHUD("Yabai has been started.");
    } catch (error) {
      showFailureToast(error, {
        title: "Error starting Yabai",
      });
    }
  }
};
