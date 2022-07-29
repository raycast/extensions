import { showToast, Toast } from "@raycast/api";
import { XcodeCleanupService } from "./services/xcode-cleanup.service";

/**
 * Xcode clear Swift Package Manager (SPM) cache command
 */
export default async () => {
  // Initialize XcodeCleanupService
  const xcodeCleanupService = new XcodeCleanupService();
  // Show loading Toast
  const loadingToast = await showToast({
    style: Toast.Style.Animated,
    title: "Please wait",
  });
  try {
    // Clear Swift Package Manager cache
    await xcodeCleanupService.clearSwiftPackageManagerCache();
    // Hide loading Toast
    await loadingToast.hide();
    // Show success Toast
    await showToast({
      style: Toast.Style.Success,
      title: "Swift Package Manager cache successfully cleared",
    });
  } catch (error) {
    // Log error
    console.error(error);
    // Hide loading Toast
    await loadingToast.hide();
    // Show failure Toast
    await showToast({
      style: Toast.Style.Failure,
      title: "An error occurred while trying to clear the Swift Package Manager cache",
    });
  }
};
