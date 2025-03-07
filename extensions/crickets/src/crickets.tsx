import { showHUD, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { exec } from "child_process";
import path from "path";

// Get the correct extension root dynamically
const extensionPreferences = getPreferenceValues();
const EXTENSION_NAME = extensionPreferences.extensionName || "crickets";

const BUNDLED_FILE = path.resolve(__dirname, "../assets/crickets.mp3"); // Development mode
const INSTALLED_FILE = path.join(
  process.env.HOME || "",
  `.config/raycast/extensions/${EXTENSION_NAME}/assets/crickets.mp3`,
); // Installed mode

// Choose the correct file based on whether it's in development or installed
const SOUND_FILE = BUNDLED_FILE.includes("repos/raycast") ? BUNDLED_FILE : INSTALLED_FILE;

export default async function Command() {
  try {
    console.log("🔍 Resolved sound file path:", SOUND_FILE);

    exec(`afplay "${SOUND_FILE}"`, (error) => {
      if (error) {
        console.error("Error playing sound:", error);
        showToast({ style: Toast.Style.Failure, title: "Failed to play sound", message: String(error) });
      }
    });

    await showHUD("🐛🎶 Playing cricket sounds... ");
  } catch (error) {
    console.error("Error:", error);
    showToast({ style: Toast.Style.Failure, title: "Error", message: String(error) });
  }
}
