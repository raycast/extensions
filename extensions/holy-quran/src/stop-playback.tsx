import { showToast, Toast } from "@raycast/api";
import { stopPlayback } from "./lib/control";

export default async function Command() {
  try {
    await stopPlayback();
    await showToast({
      style: Toast.Style.Success,
      title: "Playback stopped",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to stop playback",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
