import { showHUD } from "@raycast/api";
import { sendCommand } from "./feishin";

export default async function Command() {
  try {
    await sendCommand({ event: "play" });
    await showHUD("Toggled Play/Pause");
  } catch (err) {
    await showHUD(`Failed: ${(err as Error).message}`);
  }
}
