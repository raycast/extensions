import { showHUD } from "@raycast/api";
import { sendCommand } from "./feishin";

export default async function Command() {
  try {
    await sendCommand({ event: "repeat" });
    await showHUD("Cycled Repeat Mode");
  } catch (err) {
    await showHUD(`Failed: ${(err as Error).message}`);
  }
}
