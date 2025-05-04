import { closeMainWindow, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { maximizeActiveWindow } from "../swift-app";
import { useWindowInfo } from "./useWindowInfo";
import { useWindowStateManager } from "./useWindowStateManager";

export function useMaximizeWindow() {
  const { getWindowInfo } = useWindowInfo();
  const { saveWindowState } = useWindowStateManager();

  // Function to maximize the active window
  async function maximizeWindow() {
    try {
      // Get current window information for logging only
      await getWindowInfo();

      // Save the current window state with unique identifier
      const windowId = await saveWindowState();

      if (!windowId) {
        throw new Error("Failed to save window state");
      }

      // Close main window first to avoid showing loading state
      await closeMainWindow();

      // Call the Swift function
      await maximizeActiveWindow();

      // Display success message with window ID
      await showHUD(`🔲 Window maximized`);

      // Return to root after execution
      await popToRoot();
    } catch (error) {
      console.error("Error maximizing window:", error);

      // Check error type and provide specific message
      const errorStr = String(error);
      if (errorStr.includes("frontmost") || errorStr.includes("window") || errorStr.includes("process")) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No focused window",
        });
      } else if (errorStr.includes("Failed to get screen information")) {
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
