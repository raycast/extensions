import {
  BrowserExtension,
  Clipboard,
  closeMainWindow,
  confirmAlert,
  environment,
  getFrontmostApplication,
  showToast,
  Toast,
} from "@raycast/api";
import { loadPolicy, normalizeApp, normalizeWebsite, shouldConfirm } from "./lib/policy";

export default async function pasteCommand() {
  try {
    // Close main window immediately for no-view command
    await closeMainWindow();

    // Read clipboard content
    const clipboardContent = await Clipboard.readText();

    if (!clipboardContent || clipboardContent.trim().length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard is empty",
        message: "Nothing to paste",
      });
      return;
    }

    // Load security policy
    const policy = await loadPolicy();

    // Resolve context - get frontmost application
    const frontmostApp = await getFrontmostApplication();
    const app = normalizeApp(frontmostApp.bundleId ?? frontmostApp.name ?? "Unknown App");

    // Resolve context - get active website if browser access available
    let website: string | undefined;
    if (environment.canAccess(BrowserExtension)) {
      try {
        const tabs = await BrowserExtension.getTabs();
        const activeTab = tabs.find((tab) => tab.active);
        if (activeTab?.url) {
          website = normalizeWebsite(activeTab.url);
        }
      } catch (error) {
        // Browser extension access failed, continue without website
        console.warn("[paste-safely] Failed to read active browser tab, continuing without website context", error);
      }
    }

    // Evaluate if confirmation is required
    const context = { app, website };
    const requiresConfirmation = shouldConfirm(policy, context);

    if (requiresConfirmation) {
      const compactContent = clipboardContent.trim().replace(/\s+/g, " ");
      const maxPreviewLength = 180;
      const preview =
        compactContent.length > maxPreviewLength
          ? `${compactContent.slice(0, maxPreviewLength - 1)}...`
          : compactContent;
      const isApproved = await confirmAlert({
        title: "Confirm Paste",
        message: `You are about to paste:\n"${preview}"`,
        primaryAction: {
          title: "Paste",
        },
      });

      if (!isApproved) {
        return;
      }
    }

    // Execute paste
    await Clipboard.paste(clipboardContent);

    await showToast({
      style: Toast.Style.Success,
      title: "Pasted successfully",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Paste failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
