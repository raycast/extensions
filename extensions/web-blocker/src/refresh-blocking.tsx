/**
 * Force Re-Block & Fix Command
 * Uses 100% GUARANTEED blocking with ALL methods:
 * - Closes all blocked website tabs
 * - Updates hosts file (DNS blocking)
 * - Configures PF firewall (packet blocking)
 * - Kills existing connections
 * - Flushes DNS cache
 *
 * Useful when:
 * - A website isn't being blocked properly
 * - Need to ensure blocking is 100% effective
 * - Existing connections need to be terminated
 * - General troubleshooting
 */

import { showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { getBlockedDomainList, getBlockingStatus } from "./storage";
import { showLongHUD } from "./hudHelper";
import { syncBlockingStatus } from "./statusVerifier";
import { closeBlockedTabs } from "./browserRefresher";
// Use 100% guaranteed blocking for maximum effectiveness
import { enable100PercentBlocking } from "./guaranteed100PercentBlocking";

export default async function RefreshBlocking() {
  try {
    // Check current blocking status
    const blockingStatus = await getBlockingStatus();
    const blockedDomains = await getBlockedDomainList();

    if (blockedDomains.length === 0) {
      await showLongHUD(
        "❌ No websites in your block list. Add some websites first!",
      );
      return;
    }

    const actionText = blockingStatus.isActive
      ? "Re-enable blocking and close blocked tabs?"
      : "Enable blocking and close blocked tabs?";

    const confirmed = await confirmAlert({
      title: "Force Re-Block & Fix",
      message: actionText,
      primaryAction: {
        title: "Close Tabs & Enable",
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
      title: "🚫 Closing Tabs & Enabling Blocking...",
      message: "Closing blocked website tabs...",
    });

    try {
      // STEP 1: Close all blocked tabs FIRST
      loadingToast.message = "Closing all blocked website tabs...";
      await closeBlockedTabs(blockedDomains);

      // Small delay to let tabs close
      await new Promise((resolve) => setTimeout(resolve, 500));

      // STEP 2: Enable 100% GUARANTEED blocking (all methods)
      loadingToast.message =
        "Enabling 100% guaranteed blocking (all methods)...";
      loadingToast.message = "Please enter password when prompted";

      const result = await enable100PercentBlocking(blockedDomains);

      if (result.success) {
        // Verify and update status from actual hosts file
        await syncBlockingStatus();

        await showToast({
          style: Toast.Style.Success,
          title: "🔥 Force Re-Block Complete!",
          message: `${result.message}\n\nTabs closed + All blocking methods active!`,
        });

        await showLongHUD(
          "🔥 Force re-block complete! 100% guaranteed blocking active!",
        );
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      loadingToast.hide();
      await showFailureToast(err, { title: "Refresh Error" });
    }
  } catch (err) {
    await showFailureToast(err, { title: "Unexpected Error" });
  }
}
