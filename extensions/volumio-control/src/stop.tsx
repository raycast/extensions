import { showToast, Toast, showHUD } from "@raycast/api";
import { VolumioAPI } from "./volumio-api";

export default async function Stop() {
  const api = new VolumioAPI();

  try {
    await api.stop();
    await showHUD("⏹ Stopped");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to stop playback",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
