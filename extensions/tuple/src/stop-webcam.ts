import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getActiveCall, isNoActiveCall, stopWebcam } from "./lib/tuple";

export default async function StopWebcam() {
  try {
    const call = await getActiveCall();
    await stopWebcam(call.call_id);
    await showHUD("Asked Tuple to stop your webcam");
  } catch (error) {
    if (isNoActiveCall(error)) {
      await showHUD("No active call");
      return;
    }
    await showFailureToast(error, { title: "Could Not Stop Webcam" });
  }
}
