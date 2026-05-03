import { showHUD } from "@raycast/api";
import { sendCommand } from "./feishin";

export default async function Command() {
  try {
    await sendCommand({ event: "shuffle" });
    await showHUD("Toggled Shuffle");
  } catch (err) {
    await showHUD(`Failed: ${(err as Error).message}`);
  }
}
