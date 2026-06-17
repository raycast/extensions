import { showHUD } from "@raycast/api";
import { YASB } from "./executor";

export default async function Update() {
  try {
    await YASB.executeCommand(YASB.UPDATE_COMMAND);
    await showHUD("YASB updated successfully");
  } catch (error) {
    console.error("Error updating YASB:", error);
    await showHUD("Failed to update YASB");
    return;
  }
}
