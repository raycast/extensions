import { showToast, Toast, showHUD } from "@raycast/api";
import { VolumioAPI } from "./volumio-api";

export default async function Pause() {
  const api = new VolumioAPI();

  try {
    await api.pause();
    await showHUD("⏸ Paused");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to pause playback",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
