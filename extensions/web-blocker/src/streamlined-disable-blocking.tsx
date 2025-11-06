/**
 * Streamlined Disable Blocking Command
 * Uses cached authentication, smart browser detection, comprehensive unblocking
 */

import { showToast, Toast, confirmAlert, Alert } from "@raycast/api";

import { setBlockingStatus } from "./storage";
import { showLongHUD } from "./hudHelper";
import { syncBlockingStatus } from "./statusVerifier";
import {
  disableBlocking,
  getPasswordSessionInfo,
} from "./streamlinedHostsManager";

export default async function StreamlinedDisableBlocking() {
  try {
    // Show confirmation
    const confirmed = await confirmAlert({
      title: "Disable Website Blocking",
      message: "Remove all website blocks and restore access?",
      primaryAction: {
        title: "Disable Blocking",
        style: Alert.ActionStyle.Default,
      },
      dismissAction: {
        title: "Cancel",
        style: Alert.ActionStyle.Cancel,
      },
    });

    if (!confirmed) {
      return;
    }

    // Show loading toast
    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Disabling Website Blocking...",
      message: "Removing all blocks...",
    });

    try {
      // Use the comprehensive unblocking function
      const result = await disableBlocking();

      if (result.success) {
        // Verify and update blocking status from actual hosts file
        await syncBlockingStatus();

        // Show success feedback
        await showToast({
          style: Toast.Style.Success,
          title: "✅ Website Blocking Disabled",
          message:
            "All websites unblocked successfully\n\n🔄 Auto-refreshing open tabs for 5 seconds to restore access immediately!",
        });

        // Additional success info
        await showLongHUD(
          "🎉 All websites unblocked! Open tabs are being automatically refreshed",
        );
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Disable Blocking",
          message: result.message,
        });
      }
    } catch (error: any) {
      loadingToast.hide();

      if (
        error.message.includes("Authentication failed") ||
        error.message.includes("canceled")
      ) {
        await showLongHUD(
          "⚠️ Authentication canceled - blocking remains active",
        );
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error Disabling Blocking",
          message: error.message || "An unexpected error occurred",
        });
      }

      console.error("Error disabling blocking:", error);
    }
  } catch (error: any) {
    console.error("Error in StreamlinedDisableBlocking command:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Unexpected Error",
      message: "Failed to disable website blocking",
    });
  }
}
