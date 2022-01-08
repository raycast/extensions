import { showToast, ToastStyle } from "@raycast/api";
import { XcodeCleanupService } from "./services/xcode-cleanup.service";

/**
 * Xcode clear derived data command
 */
export default async () => {
  // Initialize XcodeCleanupService
  const xcodeCleanupService = new XcodeCleanupService();
  // Show loading Toast
  const loadingToast = await showToast(ToastStyle.Animated, "Please wait");
  try {
    // Clear DerivedData
    await xcodeCleanupService.clearDerivedData();
    // Hide loading Toast
    await loadingToast.hide();
    // Show success Toast
    await showToast(ToastStyle.Success, "Derived Data successfully cleared");
  } catch (error) {
    // Log error
    console.error(error);
    // Hide loading Toast
    await loadingToast.hide();
    // Show failure Toast
    await showToast(ToastStyle.Failure, "An error occurred while trying to clear the Derived Data directory");
  }
};
