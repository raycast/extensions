import { spawn } from "child_process";
import { showToast, Toast, showHUD } from "@raycast/api";
import { join } from "path";
import { readFileSync } from "fs";

export default async function Command() {
  try {
    // Show recording started notification
    await showHUD("🎙️ Recording...");

    const scriptPath = join(__dirname, "assets/whisper-voice-input.sh");
    const scriptContent = readFileSync(scriptPath, "utf-8");

    // Execute the shell script using spawn for greater reliability
    await new Promise<void>((resolve, reject) => {
      const child = spawn("/bin/bash");

      let stderr = "";

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        if (code !== 0) {
          // The script exited with an error.
          return reject(new Error(stderr));
        }
        // The script succeeded.
        resolve();
      });

      child.on("error", (err) => {
        // Failed to spawn the process
        reject(err);
      });

      // Write the script content to the bash process and close its input
      child.stdin.write(scriptContent);
      child.stdin.end();
    });

    // Show success notification
    await showHUD("✅ Transcribed and pasted!");

    await showToast({
      style: Toast.Style.Success,
      title: "Success",
      message: "Voice input processed successfully",
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: errorMessage,
    });

    // Log the error for debugging
    console.error("Whisper Voice Input Error:", error);
  }
}
