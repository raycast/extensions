import { showHUD } from "@raycast/api";
import { sendGatherKeystroke } from "./utils";

export default async function Command() {
  if (await sendGatherKeystroke("d", ["command down"])) {
    await showHUD("Returning to desk");
  }
}
