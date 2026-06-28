import { showToast, Toast } from "@raycast/api";
import { stopPlayback } from "./playback-controller";
import { abortActiveStreamingRequest } from "./stream-session";

export default async function Command() {
  const abortedStream = await abortActiveStreamingRequest();
  const stoppedPlayback = await stopPlayback();
  const stopped = abortedStream || stoppedPlayback;

  await showToast({
    style: stopped ? Toast.Style.Success : Toast.Style.Failure,
    title: stopped ? "Audio stopped" : "No audio is playing",
    message: stopped ? undefined : "Start reading text first, then stop it here.",
  });
}
