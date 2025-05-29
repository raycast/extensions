import { showToast, Toast, showHUD } from "@raycast/api";
import { VolumioAPI } from "./volumio-api";

export default async function PlayPause() {
  const api = new VolumioAPI();

  try {
    const state = await api.getPlayerState();
    await api.toggle();

    if (state.status === "play") {
      await showHUD("⏸ Paused");
    } else {
      await showHUD("▶️ Playing");
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to toggle playback",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
