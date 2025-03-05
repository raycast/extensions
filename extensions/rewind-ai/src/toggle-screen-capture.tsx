import { showHUD } from "@raycast/api";
import { execSync } from "child_process";

export default async function Command() {
  try {
    // Get current screen capture status
    const screenCaptureOutput = execSync("defaults read com.memoryvault.MemoryVault recordOnLaunch").toString().trim();
    const isScreenCaptureEnabled = screenCaptureOutput === "1";

    // Toggle the screen capture setting
    const newValue = isScreenCaptureEnabled ? "0" : "1";
    execSync(`defaults write com.memoryvault.MemoryVault recordOnLaunch -int ${newValue}`);

    // Restart Rewind to apply changes
    execSync("killall Rewind || true");
    execSync("open -a Rewind");

    // Show HUD notification
    await showHUD(`Screen Capture ${isScreenCaptureEnabled ? "Disabled" : "Enabled"}`);
  } catch (error) {
    console.error("Error toggling screen capture:", error);
    await showHUD("Failed to toggle screen capture");
  }
}
