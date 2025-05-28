import { closeMainWindow } from "@raycast/api";
import { useWindowInfo } from "./useWindowInfo";
import { useWindowStateManager } from "./useWindowStateManager";
import { resizeWindow } from "../swift-app";
import { log, error as logError } from "../utils/logger";

interface WindowResizeOptions {
  onNoWindow: () => Promise<void>;
  onAlreadyResized: (width: number, height: number) => Promise<void>;
  onResizeComplete: (width: number, height: number, isRestricted: boolean) => Promise<void>;
  onError: (error: unknown) => Promise<void>;
}

export function useBaseWindowResize() {
  const { getWindowInfo } = useWindowInfo();
  const { saveWindowState } = useWindowStateManager();

  async function adjustWindowSize(width: number, height: number, options: WindowResizeOptions) {
    try {
      // First, get the current window info - this is always needed for the size check
      const windowInfo = await getWindowInfo();
      if (!windowInfo) {
        await options.onNoWindow();
        return;
      }
      const { x: currentX, y: currentY, width: currentWidth, height: currentHeight } = windowInfo;

      // Check if the window is already at the requested size - if so, just return early
      if (currentWidth === width && currentHeight === height) {
        await options.onAlreadyResized(width, height);
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

        // Call the completion handler with the result
        await options.onResizeComplete(result.width, result.height, sizeWasRestricted);
      } catch {
        throw new Error("Failed to set window size");
      }
    } catch (err) {
      logError("🛑 Error resizing window:", err);
      await options.onError(err);
    }
  }

  return {
    adjustWindowSize,
  };
}
