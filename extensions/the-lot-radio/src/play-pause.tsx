import { Toast, closeMainWindow, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { isPlaying, play } from "./api/play";
import { STREAM_URL } from "./constants/constants";

export default async function Command() {
  try {
    const playing = await isPlaying(STREAM_URL);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: playing ? "Stopping The Lot Radio audio stream" : "Opening The Lot Radio audio stream",
    });

    toast.title = await play(STREAM_URL);
    toast.style = Toast.Style.Success;
    await closeMainWindow({ clearRootSearch: true });
  } catch (err) {
    await showFailureToast(err, { title: "Sorry! Could not open The Lot Radio audio stream" });
  }
}
