import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { hangUpCall, isNoActiveCall } from "./lib/tuple";

export default async function HangUp() {
  try {
    await hangUpCall();
    await showHUD("Call ended");
  } catch (error) {
    if (isNoActiveCall(error)) {
      await showHUD("No active call");
      return;
    }
    await showFailureToast(error, { title: "Could Not Hang Up" });
  }
}
