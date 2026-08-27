import { Toast, showToast } from "@raycast/api";
import { cancelDeviceConnection } from "./airbuddy";
import { showFailure } from "./feedback";

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Cancelling connection…" });

  try {
    // Called bare: AirBuddy has no scriptable "pending connection" state to read (verified — no
    // property in the sdef exposes it), and this extension's own connect commands now BLOCK until
    // the operation completes rather than returning while pending. So there's no window in which
    // Raycast can offer a per-device "cancel" action for a connection IT initiated — this command
    // exists for a pending connection AirBuddy is running from its own UI, a Shortcut, or another
    // script. Generic accessory connections can't be cancelled this way (sdef); only a headset's
    // Bluetooth connection pipeline can.
    await cancelDeviceConnection();

    toast.style = Toast.Style.Success;
    toast.title = "Connection Cancelled";
  } catch (error) {
    await showFailure("Couldn't cancel the connection", error);
  }
}
