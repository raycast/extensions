import { showHUD } from "@raycast/api";
import { YASB } from "./executor";

export default async function DisableAutostart() {
  try {
    await YASB.executeCommand(YASB.DISABLE_AUTO_START_COMMAND);
    await showHUD("YASB autostart disabled");
  } catch (error) {
    console.error("Error disabling YASB autostart:", error);
    await showHUD("Failed to disable YASB autostart");
    return;
  }
}
