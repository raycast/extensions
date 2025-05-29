import { showToast, Toast, showHUD } from "@raycast/api";
import { VolumioAPI } from "./volumio-api";

export default async function PreviousTrack() {
  const api = new VolumioAPI();

  try {
    await api.previous();
    await showHUD("⏮ Previous Track");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to skip to previous track",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
