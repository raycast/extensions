import { showHUD } from "@raycast/api";
import { sendGatherKeystroke } from "./utils";

export default async function Command() {
  if (await sendGatherKeystroke("k", ["command down"])) {
    await showHUD("Search opened");
  }
}
