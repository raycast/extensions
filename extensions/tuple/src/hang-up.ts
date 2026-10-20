import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getActiveCall, hangUpCall, isNoActiveCall } from "./lib/tuple";

export default async function HangUp() {
  try {
    await getActiveCall();
    await hangUpCall();
    await showHUD("Left call");
  } catch (error) {
    if (isNoActiveCall(error)) {
      await showHUD("No active call");
      return;
    }
    await showFailureToast(error, { title: "Could Not Leave Call" });
  }
}
