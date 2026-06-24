import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { isCallMuted } from "./lib/call";
import { getActiveCall, isNoActiveCall, muteCall, unmuteCall } from "./lib/tuple";

export default async function ToggleMute() {
  try {
    const call = await getActiveCall();
    if (isCallMuted(call)) {
      await unmuteCall();
      await showHUD("Unmuted");
    } else {
      await muteCall();
      await showHUD("Muted");
    }
  } catch (error) {
    if (isNoActiveCall(error)) {
      await showHUD("No active call");
      return;
    }
    await showFailureToast(error, { title: "Could Not Toggle Mute" });
  }
}
