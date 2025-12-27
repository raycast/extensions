import { showToast, Toast, Clipboard } from "@raycast/api";
import { detectIP } from "./utils/detectors";

export default async function Command() {
  try {
    const ipAddress = await detectIP();
    await Clipboard.copy(ipAddress);
    await showToast({
      style: Toast.Style.Success,
      title: "IP Address Copied",
      message: ipAddress,
    });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Detect IP",
      message: "No internet connection",
    });
  }
}
