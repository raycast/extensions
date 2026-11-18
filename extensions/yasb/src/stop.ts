import { showHUD } from "@raycast/api";
import { YASB } from "./executor";

export default async function Stop() {
  try {
    await YASB.executeCommand(YASB.STOP_COMMAND);
    await showHUD("YASB stopped successfully");
  } catch (error) {
    console.error("Error stopping YASB:", error);
    await showHUD("Failed to stop YASB");
    return;
  }
}
