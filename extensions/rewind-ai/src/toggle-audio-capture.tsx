import { showHUD } from "@raycast/api";
import { execSync } from "child_process";

export default async function Command() {
  try {
    // Get current audio capture status
    const audioCaptureOutput = execSync("defaults read com.memoryvault.MemoryVault recordAudioOnLaunch")
      .toString()
      .trim();
    const isAudioCaptureEnabled = audioCaptureOutput === "1";

    // Toggle the audio capture setting
    const newValue = isAudioCaptureEnabled ? "0" : "1";
    execSync(`defaults write com.memoryvault.MemoryVault recordAudioOnLaunch -int ${newValue}`);

    // Restart Rewind to apply changes
    execSync("killall Rewind || true");
    execSync("open -a Rewind");

    // Show HUD notification
    await showHUD(`Audio Capture ${isAudioCaptureEnabled ? "Disabled" : "Enabled"}`);
  } catch (error) {
    console.error("Error toggling audio capture:", error);
    await showHUD("Failed to toggle audio capture");
  }
}
