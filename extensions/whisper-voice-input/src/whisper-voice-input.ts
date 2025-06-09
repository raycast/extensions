import { exec } from "child_process";
import { showToast, Toast, showHUD } from "@raycast/api";
import { promisify } from "util";
import { join } from "path";

const execAsync = promisify(exec);

export default async function Command() {
  try {
    // Show recording started notification
    await showHUD("🎙️ Recording...");

    // Get the absolute path to the shell script
    const scriptPath = join(__dirname, "whisper-voice-input.sh");

    // Execute the shell script
    const { stdout, stderr } = await execAsync(`bash "${scriptPath}"`);

    if (stderr) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Transcription Failed",
        message: stderr,
      });
      return;
    }

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
