/**
 * Streamlined Enable Blocking Command
 * Single password prompt, smart browser detection, comprehensive blocking
 */

import { showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { getBlockedDomains, getEnabledDomains } from "./storage";
import { syncBlockingStatus } from "./statusVerifier";
import { showLongHUD } from "./hudHelper";
import { enable100PercentBlocking } from "./guaranteed100PercentBlocking";
import { closeBlockedTabs } from "./browserRefresher";

export default async function StreamlinedEnableBlocking() {
  try {
    // Get all domains and filter for enabled ones
    const allDomains = await getBlockedDomains();
    const domainsToBlock = await getEnabledDomains();

    if (allDomains.length === 0) {
      await showLongHUD(
        "❌ No websites in your block list. Add some websites first!",
      );
      return;
    }

    if (domainsToBlock.length === 0) {
      await showLongHUD(
        '❌ No enabled websites to block. Enable some websites in "Manage Blocked Sites" first!',
      );
      return;
    }

    const disabledCount = allDomains.length - domainsToBlock.length;
    const statusMsg =
      disabledCount > 0
        ? `\n${disabledCount} website(s) disabled and won't be blocked`
        : "";

    // Show confirmation
    const confirmed = await confirmAlert({
      title: "Enable Website Blocking",
      message: `Block ${domainsToBlock.length} of ${allDomains.length} website(s)?${statusMsg}`,
      primaryAction: {
        title: "Enable Blocking",
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
      title: "🚫 Enabling Website Blocking...",
      message: "Closing blocked website tabs...",
    });

    try {
      // Step 1: Close blocked tabs first
      console.log(
        `🚫 Closing ${domainsToBlock.length} blocked website tabs...`,
      );
      await closeBlockedTabs(domainsToBlock).catch((error) => {
        console.error("Error closing tabs:", error);
      });

      loadingToast.message = "Enabling 100% guaranteed blocking...";

      // Step 2: Use 100% GUARANTEED blocking (hosts file + firewall + connection killing)
      console.log(`🔥 Enabling 100% guaranteed blocking (ALL methods)...`);
      const result = await enable100PercentBlocking(domainsToBlock);

      if (result.success) {
        // Verify and update blocking status from actual hosts file
        await syncBlockingStatus();

        // Show success feedback
        await showToast({
          style: Toast.Style.Success,
          title: "🚫 Website Blocking Enabled",
          message: `Successfully blocked ${domainsToBlock.length} website(s)\n\n✅ Tabs closed + Cache bypass prevented!\n� Blocked tabs were force-refreshed\n(Browser stayed open!)`,
        });

        // Additional success info
        await showLongHUD(
          "✅ Blocking active! No cache bypass possible - Browser stayed open!",
        );
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Enable Blocking",
          message: result.message,
        });
      }
    } catch (err) {
      loadingToast.hide();
      const errorMessage = err instanceof Error ? err.message : String(err);

      if (
        errorMessage.includes("Authentication failed") ||
        errorMessage.includes("canceled")
      ) {
        await showLongHUD("⚠️ Authentication canceled - blocking not enabled");
      } else {
        await showFailureToast(err, { title: "Error Enabling Blocking" });
      }
    }
  } catch (err) {
    await showFailureToast(err, { title: "Unexpected Error" });
  }
}
