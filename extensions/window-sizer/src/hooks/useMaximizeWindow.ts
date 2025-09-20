import { closeMainWindow, showHUD, showToast, Toast, PopToRootType } from "@raycast/api";
import { maximizeActiveWindow } from "../swift-app";
import { useWindowStateManager } from "./useWindowStateManager";

export function useMaximizeWindow() {
  const { saveWindowState } = useWindowStateManager();

  // Function to maximize the active window
  async function maximizeWindow() {
    try {
      // Try to save the current window state, but continue even if it fails
      await saveWindowState();

      // Then check if the window is already maximized
      const result = await maximizeActiveWindow();

      // If window is already maximized, just show toast and return
      if (result === "Already maximized") {
        await showToast({
          style: Toast.Style.Success,
          title: "Already maximized",
        });
        return;
      }

      // If there was an error checking window state
      if (result.startsWith("Error:")) {
        throw new Error(result);
      }

      // Only if the window was successfully maximized (not already maximized)
      if (result === "Success") {
        // Close main window to avoid showing loading state
        await closeMainWindow();

        // Display success message
        await showHUD(`↙↗ Window maximized`, {
          popToRootType: PopToRootType.Immediate,
        });
      } else {
        // Handle unexpected response
        throw new Error(`Unexpected response: ${result}`);
      }
    } catch (error) {
      console.error("Error maximizing window:", error);

      // Check error type and provide specific message
      const errorStr = String(error);
      if (
        errorStr.includes("frontmost") ||
        errorStr.includes("window") ||
        errorStr.includes("process") ||
        errorStr.includes("Failed to get screen information") ||
        errorStr.includes("No active window")
      ) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No focused window",
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Maximization failed",
        });
      }
    }
  }

  return {
    maximizeWindow,
  };
}
