import { showToast, Toast, LocalStorage } from "@raycast/api";
import { stopAudio } from "./lib/audio";

export default async function Command() {
  try {
    await stopAudio();
    await LocalStorage.removeItem("currently_playing");
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
