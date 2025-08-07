import { showToast, Toast } from "@raycast/api";
import {
  loadPlaybackState,
  savePlaybackState,
  clearPlaybackState,
} from "./shared-state";

export default async function Command() {
  try {
    const currentState = loadPlaybackState();

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

          showToast({
            style: Toast.Style.Success,
            title: "⏸ Paused",
            message: currentState.currentTrack
              ? `"${currentState.currentTrack.name}" paused`
              : "Looma.FM music paused",
          });
        } catch (error) {
          showToast({
            style: Toast.Style.Failure,
            title: "Pause Error",
            message: "Could not pause music - process may have already ended",
          });
          // Clear state since process is likely gone
          clearPlaybackState();
        }
      } else if (currentState.isPaused && currentState.currentTrack) {
        // Resume playback by clearing paused state - main player will handle resume
        savePlaybackState({
          ...currentState,
          isPlaying: false,
          isPaused: false, // Signal to resume
        });

        showToast({
          style: Toast.Style.Success,
          title: "▶️ Resume",
          message: `Open Looma.FM Music to resume "${currentState.currentTrack.name}"`,
        });
      } else {
        showToast({
          style: Toast.Style.Animated,
          title: "No Music Playing",
          message: "Open Looma.FM Music to start streaming",
        });
      }
    } else {
      // No saved state - no specific process to target
      showToast({
        style: Toast.Style.Animated,
        title: "No Music Playing",
        message: "Open Looma.FM Music to start streaming",
      });
    }
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: "Failed to pause music",
    });
  }
}
