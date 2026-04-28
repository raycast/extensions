import { showHUD } from "@raycast/api";
import { sendGatherKeystroke } from "./utils";

export default async function Command() {
  if (await sendGatherKeystroke("d", ["shift down", "command down"])) {
    await showHUD("Toggled microphone and camera");
  }
}
