import { showHUD } from "@raycast/api";
import { YASB } from "./executor";

export default async function Start() {
  try {
    await YASB.executeCommand(YASB.START_COMMAND);
    await showHUD("YASB started successfully");
  } catch (error) {
    console.error("Error starting YASB:", error);
    await showHUD("Failed to start YASB");
    return;
  }
}
