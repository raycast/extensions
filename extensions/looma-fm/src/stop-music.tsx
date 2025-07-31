import { showToast, Toast } from "@raycast/api";
import { spawn } from "child_process";
import { unlinkSync, readdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export default async function Command() {
  try {
    // Kill all afplay processes to stop music
    const killProcess = spawn("pkill", ["-f", "afplay"]);

    killProcess.on("close", (code) => {
      // Clean up any temporary Looma.FM files
      try {
        const tempDir = tmpdir();
        const files = readdirSync(tempDir);
        const loomaFiles = files.filter((file) => file.startsWith("looma_"));

        loomaFiles.forEach((file) => {
          try {
            unlinkSync(join(tempDir, file));
          } catch (e) {
            console.log("Could not delete temp file:", file, e);
          }
        });
      } catch (e) {
        console.log("Could not clean up temp files:", e);
      }

      if (code === 0) {
        showToast({
          style: Toast.Style.Success,
          title: "⏹ Stopped",
          message: "Looma.FM music stopped",
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
  } catch (error) {
    console.error("Command error:", error);
    showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: "Failed to stop music",
    });
  }
}
