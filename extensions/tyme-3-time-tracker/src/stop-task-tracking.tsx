import { closeMainWindow, showHUD } from "@raycast/api";
import { stopTracking } from "./tasks";

async function StopTracking() {
  closeMainWindow();

  const successfullyStopped = await stopTracking();

  const message = successfullyStopped ? "Successfully stopped tracking ⏸️" : "Could not stop tracking task";

  await showHUD(message);
}

export default StopTracking;
