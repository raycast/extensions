import { showHUD } from "@raycast/api";
import { YASB } from "./executor";

export default async function Reload() {
  try {
    await YASB.executeCommand(YASB.RELOAD_COMMAND);
    await showHUD("YASB reloaded successfully");
  } catch (error) {
    console.error("Error reloading YASB:", error);
    await showHUD("Failed to reload YASB");
    return;
  }
}
