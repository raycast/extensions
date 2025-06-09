import { exec } from "child_process";
import { promisify } from "util";
import { showToast, Toast, showHUD } from "@raycast/api";
import { join } from "path";

const execAsync = promisify(exec);

export default async function Command() {
  try {
    // Show recording started notification
    await showHUD("🎙️ Recording...");

    const scriptPath = join(__dirname, "assets/whisper-voice-input.sh");

    // Execute the shell script and handle stderr
    const { stderr } = await execAsync(`bash "${scriptPath}"`);

    if (stderr) {
      throw new Error(stderr);
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
