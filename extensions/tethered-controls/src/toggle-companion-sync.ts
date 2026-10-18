import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { sendToTethered } from "./send-to-tethered";

export default async function Command(): Promise<void> {
  try {
    await sendToTethered("tethered://control/companion-sync/toggle");
    await showHUD("Companion Sync toggle requested; requires a supporting Tethered app");
  } catch (error) {
    await showFailureToast(error, { title: "Could not send Companion Sync request" });
  }
}
