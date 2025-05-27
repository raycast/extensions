import { showHUD, showToast, Toast, closeMainWindow, PopToRootType } from "@raycast/api";
import { useWindowInfo } from "./useWindowInfo";
import { useWindowStateManager } from "./useWindowStateManager";
import { resizeWindow } from "../swift-app";
import { log, error as logError } from "../utils/logger";

export function useWindowResize() {
  const { getWindowInfo } = useWindowInfo();
  const { saveWindowState } = useWindowStateManager();

  // Function to adjust window to specific dimensions
  async function adjustWindowSize(width: number, height: number) {
    try {
      // First, get the current window info - this is always needed for the size check
      const windowInfo = await getWindowInfo();
      if (!windowInfo) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No focused window",
        });
        return;
      }
      const { x: currentX, y: currentY, width: currentWidth, height: currentHeight } = windowInfo;

      // Check if the window is already at the requested size - if so, just return early
      if (currentWidth === width && currentHeight === height) {
        await showToast({
          style: Toast.Style.Success,
          title: `Already in ${width}×${height}`,
        });
        return;
      }

      // Save current window state before resize
      const saveResult = await saveWindowState();
      if (!saveResult) {
        logError("Failed to save window state before resize");
      }

      // Close main window first to avoid showing loading state
      await closeMainWindow();

      try {
        // Call the Swift resizeWindow function
        const result = await resizeWindow(width, height, currentX, currentY);

        // Log basic size information
        log(`Size comparison - Requested: ${width}×${height}, Actual: ${result.width}×${result.height}`);

        // Check for window information
        const { width: actualWidth, height: actualHeight, requestedWidth, requestedHeight } = result;

        // Check if actual size differs from requested size (with small tolerance)
        const sizeTolerance = 5; // 5 pixels tolerance
        const sizeWasRestricted =
          Math.abs(actualWidth - requestedWidth) > sizeTolerance ||
          Math.abs(actualHeight - requestedHeight) > sizeTolerance;

        // Append restriction info if size was constrained
        const appRestrictionInfo = sizeWasRestricted ? " (Restricted)" : "";

        // Display unified message format for all cases
        await showHUD(`↔ Resized to ${result.width}×${result.height}${appRestrictionInfo}`, {
          popToRootType: PopToRootType.Immediate,
        });
      } catch (error) {
        logError("Error setting window size:", error);
        throw new Error("Failed to set window size");
      }
    } catch (err) {
      logError("🛑 Error resizing window:", err);

      // Handle different error types with specific messages
      const errorStr = String(err);
      if (
        errorStr.includes("frontmost") ||
        errorStr.includes("window") ||
        errorStr.includes("process") ||
        errorStr.includes("Failed to get screen information")
      ) {
        await showHUD("🛑 No focused window");
      } else {
        await showHUD("🛑 Resize failed");
      }
    }
  }

  return {
    resizeWindow: adjustWindowSize,
  };
}
