import { showToast, Toast } from "@raycast/api";
import {
  loadPlaybackState,
  savePlaybackState,
  clearPlaybackState,
} from "./shared-state";
import { showFailureToast } from "@raycast/utils";

export default async function Command() {
  try {
    const currentState = loadPlaybackState();

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "⏸ Pausing...",
    });

    if (currentState) {
      if (currentState.isPlaying && currentState.pid) {
        // Pause the music using stored PID for targeted killing
        try {
          process.kill(currentState.pid, "SIGTERM");

          // Update state to paused
          savePlaybackState({
            ...currentState,
            isPlaying: false,
            isPaused: true,
          });

          toast.title = "⏸ Paused";
          toast.style = Toast.Style.Success;
          toast.message = currentState.currentTrack
            ? `"${currentState.currentTrack.name}" paused`
            : "Looma.FM music paused";
        } catch (error) {
          await showFailureToast(error);

          clearPlaybackState();
        }
      } else if (currentState.isPaused && currentState.currentTrack) {
        // Resume playback by clearing paused state - main player will handle resume
        savePlaybackState({
          ...currentState,
          isPlaying: false,
          isPaused: false, // Signal to resume
        });

        toast.title = "▶️ Resume";
        toast.style = Toast.Style.Success;
        toast.message = `Open Looma.FM Music to resume "${currentState.currentTrack.name}"`;
      } else {
        toast.title = "No Music Playing";
        toast.style = Toast.Style.Success;
        toast.message = "Open Looma.FM Music to start streaming";
      }
    } else {
      toast.title = "No Music Playing";
      toast.style = Toast.Style.Success;
      toast.message = "Open Looma.FM Music to start streaming";
    }
  } catch (error) {
    await showFailureToast(error);
  }
}
