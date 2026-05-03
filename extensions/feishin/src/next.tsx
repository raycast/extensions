import { showHUD } from "@raycast/api";
import { sendCommand } from "./feishin";

export default async function Command() {
  try {
    await sendCommand({ event: "next" });
    await showHUD("Next Track");
  } catch (err) {
    await showHUD(`Failed: ${(err as Error).message}`);
  }
}
