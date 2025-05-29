import { showToast, Toast, showHUD } from "@raycast/api";
import { VolumioAPI } from "./volumio-api";

export default async function NextTrack() {
  const api = new VolumioAPI();

  try {
    await api.next();
    await showHUD("⏭ Next Track");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to skip to next track",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
