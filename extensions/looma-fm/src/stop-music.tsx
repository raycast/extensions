import { showToast, Toast, environment } from "@raycast/api";
import { spawn } from "child_process";
import { unlinkSync, readdirSync } from "fs";
import { join } from "path";
import { loadPlaybackState, clearPlaybackState } from "./shared-state";
import { showFailureToast } from "@raycast/utils";

export default async function Command() {
  try {
    const currentState = loadPlaybackState();

    // Stop music using stored PID if available, otherwise fallback to pkill
    if (currentState && currentState.pid) {
      try {
        process.kill(currentState.pid, "SIGTERM");
        showToast({
          style: Toast.Style.Success,
          title: "⏹ Stopped",
          message: "Looma.FM music stopped",
        });
      } catch (error) {
        // PID might be stale, fallback to generic pkill
        console.log(error);
        const killProcess = spawn("pkill", ["-f", "afplay"]);
        killProcess.on("close", () => {
          showToast({
            style: Toast.Style.Success,
            title: "⏹ Stopped",
            message: "Music stopped",
          });
        });
      }
    } else {
      // No stored state, use generic pkill as fallback
      const killProcess = spawn("pkill", ["-f", "afplay"]);
      killProcess.on("close", (code) => {
        if (code === 0) {
          showToast({
            style: Toast.Style.Success,
            title: "⏹ Stopped",
            message: "Music stopped",
          });
        } else {
          showToast({
            style: Toast.Style.Success,
            title: "⏹ Stopped",
            message: "No music was playing",
          });
        }
      });
      killProcess.on("error", (err) => {
        console.error("Stop error:", err);
        showToast({
          style: Toast.Style.Failure,
          title: "Stop Error",
          message: "Could not stop music",
        });
      });
    }

    // Clean up temporary Looma.FM files from support directory
    try {
      const supportDir = join(environment.supportPath, "audio-cache");
      const files = readdirSync(supportDir);
      const loomaFiles = files.filter(
        (file) => file.startsWith("looma_") || file.startsWith("meditation_"),
      );

      loomaFiles.forEach((file) => {
        try {
          unlinkSync(join(supportDir, file));
        } catch (e) {
          console.log("Could not delete temp file:", file, e);
        }
      });
    } catch (e) {
      console.log("Could not clean up temp files:", e);
    }

    // Clear the playback state
    clearPlaybackState();
  } catch (error) {
    await showFailureToast(error);
  }
}
