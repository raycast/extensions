import { showToast, Toast, showHUD } from "@raycast/api";
import { VolumioAPI } from "./volumio-api";

export default async function Play() {
  const api = new VolumioAPI();

  try {
    await api.play();
    await showHUD("▶️ Playing");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to start playback",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
