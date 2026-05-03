import { showHUD } from "@raycast/api";
import { sendCommand } from "./feishin";

export default async function Command() {
  try {
    await sendCommand({ event: "previous" });
    await showHUD("Previous Track");
  } catch (err) {
    await showHUD(`Failed: ${(err as Error).message}`);
  }
}
