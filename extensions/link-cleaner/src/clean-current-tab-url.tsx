import {
  Clipboard,
  BrowserExtension,
  environment,
  getPreferenceValues,
  showToast,
  Toast,
  closeMainWindow,
} from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { removeQueryParams } from "./utils";
import { rules } from "./rules";

interface Preferences {
  targetBrowser: string;
  copyToClipboard: boolean;
}

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const targetBrowser = preferences.targetBrowser;
  const shouldCopy = preferences.copyToClipboard;

  if (environment.canAccess(BrowserExtension)) {
    try {
      const tabs = await BrowserExtension.getTabs();
      const currentTab = tabs.find((tab) => tab.active);

      if (currentTab) {
        // Find and apply URL cleaning rules
        let allowedParams: string[] = [];
        try {
          const currentUrl = new URL(currentTab.url);
          for (const rule of rules) {
            // Handle URLs with or without www prefix
            const ruleUrlIdentifier = rule.url.replace(/^www\./, "");
            const currentUrlIdentifier =
              currentUrl.hostname.replace(/^www\./, "") + currentUrl.pathname.replace(/\/$/, "");

            if (currentUrlIdentifier.includes(ruleUrlIdentifier)) {
              allowedParams = rule.allowParams;
              break;
            }
          }
        } catch (urlError) {
          console.error("Error parsing URL:", urlError);
        }

        const cleanedUrl = removeQueryParams(currentTab.url, allowedParams);

        if (shouldCopy) {
          await Clipboard.copy(cleanedUrl);
        }

        // Construct browser-specific AppleScript
        let appleScript = "";
        const escapedCleanedUrl = cleanedUrl.replaceAll('"', '\\"');

        if (targetBrowser === "Safari") {
          appleScript = `
            tell application "Safari"
              tell front window
                set URL of current tab to "${escapedCleanedUrl}"
              end tell
            end tell
          `;
        } else {
          appleScript = `
            tell application "${targetBrowser}"
              tell front window's active tab
                set URL to "${escapedCleanedUrl}"
              end tell
            end tell
          `;
        }

        try {
          await runAppleScript(appleScript);

          const copyMessagePart = shouldCopy ? ", copied," : "";
          await showToast({
            style: Toast.Style.Success,
            title: "Success",
            message: `URL cleaned${copyMessagePart} and updated in ${targetBrowser} tab`,
          });

          setTimeout(() => {
            closeMainWindow({ clearRootSearch: true });
          }, 2000);
        } catch (scriptError) {
          console.error("AppleScript Error:", scriptError);

          const copyMessagePart = shouldCopy ? "cleaned and copied" : "cleaned";
          await showToast({
            style: Toast.Style.Failure,
            title: "AppleScript Error",
            message: `URL ${copyMessagePart}. Failed to update ${targetBrowser} tab.`,
          });
        }
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "No active tab found",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to fetch or process URL",
      });
    }
  } else {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: "Browser extension is not available",
    });
  }
}
