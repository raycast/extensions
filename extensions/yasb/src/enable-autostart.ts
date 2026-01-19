import { showHUD } from "@raycast/api";
import { YASB } from "./executor";

export default async function EnableAutostart() {
  try {
    await YASB.executeCommand(YASB.ENABLE_AUTO_START_COMMAND);
    await showHUD("YASB autostart enabled");
  } catch (error) {
    console.error("Error enabling YASB autostart:", error);
    await showHUD("Failed to enable YASB autostart");
    return;
  }
}
