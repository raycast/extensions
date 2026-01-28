import { showHUD, showToast, Toast, closeMainWindow, PopToRootType } from "@raycast/api";
import { useWindowInfo } from "./useWindowInfo";
import { useWindowStateManager } from "./useWindowStateManager";
import { resizeWindow } from "../swift-app";
import { log, error as logError } from "../utils/logger";

export function useWindowRestore() {
  const { getWindowInfo } = useWindowInfo();
  const { getWindowState } = useWindowStateManager();

  // Function to restore previous window size
  async function restorePreviousSize() {
    try {
      // Get current window information
      const windowInfo = await getWindowInfo();
      if (!windowInfo) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No focused window",
        });
        return;
      }
      const { width: currentWidth, height: currentHeight } = windowInfo;

      // Check if there's a saved window state
      const savedState = await getWindowState();

      // If no saved state found, show toast message without closing window
      if (!savedState) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No previous size",
        });
        return;
      }

      // If current window size is already the saved size, show toast without closing window
      if (currentWidth === savedState.size.width && currentHeight === savedState.size.height) {
        await showToast({
          style: Toast.Style.Success,
          title: `Already at previous size`,
        });
        return;
      }

      // If we need to restore size, close main window first
      await closeMainWindow();

      // Get saved position or fallback to current position if not available
      let posX: number | undefined;
      let posY: number | undefined;

      if (savedState.position) {
        // Use saved position
        posX = savedState.position.x;
        posY = savedState.position.y;
      } else {
        // Fallback to current position
        const info = await getWindowInfo();
        if (!info) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to get window info",
          });
          return;
        }
        const { x: currentX, y: currentY } = info;
        posX = currentX;
        posY = currentY;
        log(`No saved position, using current position: (${posX}, ${posY})`);
      }

      log(`Restoring window to: ${savedState.size.width}×${savedState.size.height} at position (${posX}, ${posY})`);

      // Apply the saved window state using Swift API
      const result = await resizeWindow(
        savedState.size.width,
        savedState.size.height,
        posX,
        posY,
        savedState.position !== undefined,
      );

      // Check if actual size differs from requested size (with small tolerance)
      const sizeTolerance = 5; // 5 pixels tolerance
      const sizeWasRestricted =
        Math.abs(result.width - result.requestedWidth) > sizeTolerance ||
        Math.abs(result.height - result.requestedHeight) > sizeTolerance;

      // Append restriction info if size was constrained
      const appRestrictionInfo = sizeWasRestricted ? " (Restricted)" : "";

      // Show feedback based on actual dimensions
      await showHUD(`↺ Restored to ${result.width}×${result.height}${appRestrictionInfo}`, {
        popToRootType: PopToRootType.Immediate,
      });
    } catch (error) {
      logError("Error restoring window size:", error);

      // Show appropriate error message
      await showToast({
        style: Toast.Style.Failure,
        title: "Restore failed",
      });
    }
  }

  return {
    restorePreviousSize,
  };
}
