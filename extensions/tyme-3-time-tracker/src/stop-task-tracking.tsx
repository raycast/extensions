import { closeMainWindow, showHUD } from "@raycast/api";
import { stopTracking } from "./tasks";
import { showErrorHUD } from "./utils";

async function StopTracking() {
  try {
    closeMainWindow();
    const successfullyStopped = await stopTracking();
    await showHUD(successfullyStopped ? "Stopped tracking" : "Could not stop tracking task");
  } catch (error) {
    await showErrorHUD("stopping tracking", error);
  }
}

export default StopTracking;
