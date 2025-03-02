import { showToast, Toast } from "@raycast/api";
import { QuickAccessService } from "./services/quickaccess/QuickAccessService";
import { NestDeviceService } from "./services/camera/NestDeviceService";
import { OAuthManager } from "./services/auth/OAuthManager";

export default async function Command() {
  try {
    // Check if we have a valid token
    const authManager = OAuthManager.getInstance();
    try {
      await authManager.getValidToken();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Authentication Error",
        message: "Please sign in from the main extension view",
      });
      return;
    }

    // Get the quick access camera ID
    const quickAccessService = QuickAccessService.getInstance();
    const cameraId = await quickAccessService.getQuickAccessCameraId();

    if (!cameraId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Quick Access Camera",
        message: "Please set a quick access camera first",
      });
      return;
    }

    // Show loading toast
    await showToast({
      style: Toast.Style.Animated,
      title: "Opening Camera",
      message: "Launching your quick access camera...",
    });

    // Open the stream
    const deviceService = NestDeviceService.getInstance();
    await deviceService.openStream(cameraId);

    // Show success toast
    await showToast({
      style: Toast.Style.Success,
      title: "Camera Opened",
      message: "Your quick access camera is now streaming",
    });
  } catch (error) {
    console.error("Error opening quick access camera:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error instanceof Error ? error.message : "Failed to open quick access camera",
    });
  }
}
