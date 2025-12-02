/**
 * Quick Save Command
 * Save the current browser URL to Kalpa (no-view command)
 */

import { showHUD, showToast, Toast, getSelectedText, Clipboard, getFrontmostApplication, open } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { getKalpaClient } from "./utils/kalpa-client";
import { getApiToken } from "./utils/auth";

// Browser bundle identifiers
const BROWSER_BUNDLE_IDS = [
  "com.apple.Safari",
  "com.google.Chrome",
  "com.google.Chrome.canary",
  "org.chromium.Chromium",
  "com.brave.Browser",
  "com.microsoft.edgemac",
  "com.operasoftware.Opera",
  "org.mozilla.firefox",
  "com.vivaldi.Vivaldi",
  "company.thebrowser.Browser", // Arc
  "com.sigmaos.sigmaos",
];

interface BrowserTab {
  url: string;
  title: string;
}

/**
 * Get the current browser tab URL and title using AppleScript
 */
async function getCurrentBrowserTab(): Promise<BrowserTab | null> {
  const frontmostApp = await getFrontmostApplication();
  const bundleId = frontmostApp.bundleId;

  if (!bundleId || !BROWSER_BUNDLE_IDS.includes(bundleId)) {
    return null;
  }

  try {
    // Safari
    if (bundleId === "com.apple.Safari") {
      const script = `
        tell application "Safari"
          set currentTab to current tab of front window
          return (URL of currentTab) & "|||" & (name of currentTab)
        end tell
      `;
      const result = await runAppleScript(script);
      const [url, title] = result.split("|||");
      return { url: url.trim(), title: title.trim() };
    }

    // Chrome-based browsers
    if (
      bundleId === "com.google.Chrome" ||
      bundleId === "com.google.Chrome.canary" ||
      bundleId === "org.chromium.Chromium" ||
      bundleId === "com.brave.Browser" ||
      bundleId === "com.microsoft.edgemac" ||
      bundleId === "com.operasoftware.Opera" ||
      bundleId === "com.vivaldi.Vivaldi"
    ) {
      const appName = frontmostApp.name;
      const script = `
        tell application "${appName}"
          set currentTab to active tab of front window
          return (URL of currentTab) & "|||" & (title of currentTab)
        end tell
      `;
      const result = await runAppleScript(script);
      const [url, title] = result.split("|||");
      return { url: url.trim(), title: title.trim() };
    }

    // Arc Browser
    if (bundleId === "company.thebrowser.Browser") {
      const script = `
        tell application "Arc"
          set currentTab to active tab of front window
          return (URL of currentTab) & "|||" & (title of currentTab)
        end tell
      `;
      const result = await runAppleScript(script);
      const [url, title] = result.split("|||");
      return { url: url.trim(), title: title.trim() };
    }

    // Firefox (limited AppleScript support)
    if (bundleId === "org.mozilla.firefox") {
      // Firefox doesn't support AppleScript well, try clipboard fallback
      return null;
    }
  } catch (error) {
    console.error("Failed to get browser tab:", error);
    return null;
  }

  return null;
}

/**
 * Try to get URL from clipboard as fallback
 */
async function getUrlFromClipboard(): Promise<BrowserTab | null> {
  try {
    const clipboardText = await Clipboard.readText();
    if (clipboardText && isValidUrl(clipboardText)) {
      // Try to extract title from URL
      const url = new URL(clipboardText);
      const title = url.hostname + (url.pathname !== "/" ? url.pathname : "");
      return { url: clipboardText, title };
    }
  } catch {
    // Clipboard doesn't contain a valid URL
  }
  return null;
}

/**
 * Check if a string is a valid URL
 */
function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default async function QuickSaveCommand() {
  const token = getApiToken();

  // Check if API token is configured
  if (!token) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Login Required",
      message: "Open Kalpa to get your API token",
      primaryAction: {
        title: "Login to Kalpa",
        onAction: () => open("https://usekalpa.com/raycast"),
      },
    });
    return;
  }

  const client = getKalpaClient();

  try {
    // Try to get current browser tab
    let tab = await getCurrentBrowserTab();

    // Fallback to clipboard
    if (!tab) {
      tab = await getUrlFromClipboard();
    }

    if (!tab) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No URL Found",
        message: "Open a browser or copy a URL to clipboard",
      });
      return;
    }

    // Try to get selected text for context
    let selection: string | undefined;
    try {
      selection = await getSelectedText();
    } catch {
      // No text selected, that's fine
    }

    // Show saving toast
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving to Kalpa...",
      message: tab.title,
    });

    // Save the link
    await client.saveLink({
      url: tab.url,
      title: tab.title,
      selection: selection && selection.length > 0 ? selection : undefined,
    });

    // Success!
    toast.style = Toast.Style.Success;
    toast.title = "Saved to Kalpa";
    toast.message = tab.title;

    await showHUD(`✓ Saved: ${tab.title}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Save",
      message: String(error),
    });
  }
}
