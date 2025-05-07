import { closeMainWindow, showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async function Command() {
  try {
    const script = `
      tell application "System Events"
        tell appearance preferences
          set currentMode to dark mode
          set dark mode to not currentMode
          return not currentMode
        end tell
      end tell
    `;

    const result = await runAppleScript(script);
    const isDarkMode = result === "true";
    const newMode = isDarkMode ? "Dark" : "Light";

    await closeMainWindow();
    await showHUD(`${isDarkMode ? "🌙" : "☀️"} Switched to ${newMode} Mode`);
  } catch (error) {
    console.error("Error toggling appearance mode:", error);
    await showHUD("⚠️ Failed to toggle appearance mode");
  }
}
