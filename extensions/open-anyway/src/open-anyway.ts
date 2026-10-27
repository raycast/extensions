import { showHUD, showToast, Toast } from "@raycast/api";
import { runGatekeeperHelper } from "./automation";
import { openPrivacySecuritySettings } from "./navigation";
import { detectRecentBlockedApp } from "./detector";

/**
 * Open Anyway Raycast Command
 *
 * Directly activates the Gatekeeper "Open Anyway" approval control for the blocked
 * application or installer, avoiding manual System Settings navigation and scrolling.
 *
 * Workflow:
 * 1. Executes native Accessibility automation to locate and activate "Open Anyway".
 * 2. Directly triggers Apple's native confirmation dialog / Touch ID prompt.
 * 3. Hides background System Settings windows so the user experience is seamless.
 * 4. Transparently handles permissions and provides clear fallback instructions.
 */
export default async function Command() {
  try {
    // 1. Detect the specific blocked application or installer
    const detectedApp = await detectRecentBlockedApp({ timeoutMs: 1500 });

    // 2. Attempt activation of the Open Anyway control for the target application
    const result = await runGatekeeperHelper("--activate", detectedApp?.name);

    if (result.status === "confirmation_pending") {
      const appName = result.appName || detectedApp?.name;
      const targetLabel = appName ? `"${appName}"` : "blocked application";
      await showHUD(`Apple confirmation prompt is active for ${targetLabel} — complete Touch ID or password prompt.`);
      return;
    }

    if (result.status === "success") {
      const appName = result.appName || detectedApp?.name;
      const targetLabel = appName ? `"${appName}"` : "blocked application";
      await showHUD(`Activated Open Anyway for ${targetLabel} — complete Apple's confirmation prompt.`);
      return;
    }

    if (result.status === "permission_denied") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Accessibility Permission Required",
        message: "Enable Accessibility for Raycast in Privacy & Security to automate Open Anyway.",
      });
      // Fallback: Open Accessibility settings so user can grant permission
      await openPrivacySecuritySettings();
      return;
    }

    if (result.status === "not_found") {
      // Check if syspolicyd has any recent log breadcrumb as fallback inspection
      const recentLogApp = await detectRecentBlockedApp({ timeoutMs: 800 });
      if (recentLogApp) {
        await showToast({
          style: Toast.Style.Animated,
          title: `Opening Privacy & Security for "${recentLogApp.name}"`,
          message: "Could not activate button directly. Navigating to Settings...",
        });
        await openPrivacySecuritySettings();
        return;
      }

      await showHUD("No application currently waiting for Gatekeeper approval.");
      return;
    }

    // Generic error fallback
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not activate Open Anyway",
      message: result.message || "Please check System Settings → Privacy & Security manually.",
    });
  } catch (error) {
    const errorDetails = error instanceof Error ? error.message : "Unknown error";
    await showToast({
      style: Toast.Style.Failure,
      title: "Open Anyway Error",
      message: errorDetails,
    });
  }
}
