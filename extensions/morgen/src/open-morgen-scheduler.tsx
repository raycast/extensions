import { open, showHUD } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

export default async function Command() {
  try {
    // Try multiple methods to open Morgen

    // Method 1: Try direct URL scheme
    try {
      await open("morgen://open-sidebar-scheduler");
      await showHUD("Opening Booking Links in Morgen");
      return;
    } catch (error) {
      console.log("URL scheme failed, trying alternative methods");
    }

    // Method 2: Open app first, then try AppleScript
    try {
      // First open Morgen app
      await open("Morgen");

      // Use AppleScript to send URL scheme command to Morgen
      const script = `
        tell application "Morgen"
          activate
          delay 1
          open location "morgen://open-sidebar-scheduler"
        end tell
      `;

      await execPromise(`osascript -e '${script}'`);
      await showHUD("Opening Booking Links in Morgen");
      return;
    } catch (error) {
      console.error("AppleScript method failed:", error);
    }

    // Method 3: Just open the app as fallback
    await open("Morgen");
    await showHUD("Opened Morgen (Booking Links view not available)");
  } catch (error) {
    await showHUD("Failed to open Morgen");
    console.error("Error opening Morgen:", error);
  }
}
