import { showToast, ToastStyle } from "@raycast/api";
import { XcodeCleanupService } from "./services/xcode-cleanup.service";

/**
 * Xcode delete unsupported simulators command
 */
export default async () => {
  // Initialize XcodeCleanupService
  const xcodeCleanupService = new XcodeCleanupService();
  // Show loading Toast
  const loadingToast = await showToast(ToastStyle.Animated, "Please wait");
  try {
    // Delete Unsupported simulators
    await xcodeCleanupService.deleteUnsupportedSimulators();
    // Hide loading Toast
    await loadingToast.hide();
    // Show success Toast
    await showToast(ToastStyle.Success, "Unsupported simulators successfully deleted");
  } catch (error) {
    // Log error
    console.error(error);
    // Hide loading Toast
    await loadingToast.hide();
    // Show failure Toast
    await showToast(ToastStyle.Failure, "An error occurred while trying to delete unsupported simulators");
  }
};
