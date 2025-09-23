import {
  BrowserExtension,
  environment,
  getFrontmostApplication,
} from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export async function getBrowserUrl(): Promise<{
  data?: string;
  error?: Error;
}> {
  try {
    // Check if Browser Extension API is available
    if (environment.canAccess(BrowserExtension)) {
      try {
        const tabs = await BrowserExtension.getTabs();
        const activeTab = tabs.find((tab) => tab.active);

        if (activeTab?.url) {
          return { data: activeTab.url };
        }

        if (tabs.length > 0 && tabs[0].url) {
          return { data: tabs[0].url };
        }

        throw new Error("No active tab found");
      } catch (error) {
        console.warn("Browser Extension API failed:", error);
      }
    }

    // Fallback: AppleScript-based processing
    const app = await getFrontmostApplication();

    switch (app.bundleId) {
      case "company.thebrowser.Browser":
        return {
          data: await runAppleScript(
            `tell application "Arc" to return URL of active tab of front window`,
          ),
        };
      case "com.vivaldi.Vivaldi":
        return {
          data: await runAppleScript(
            `tell application "Vivaldi" to return URL of active tab of front window`,
          ),
        };
      case "com.google.Chrome":
        return {
          data: await runAppleScript(
            `tell application "Google Chrome" to return URL of active tab of front window`,
          ),
        };
      case "com.brave.Browser":
        return {
          data: await runAppleScript(
            `tell application "Brave Browser" to return URL of active tab of front window`,
          ),
        };
      case "com.apple.Safari":
        return {
          data: await runAppleScript(
            `tell application "Safari" to return URL of front document`,
          ),
        };
      case "com.kagi.kagimacOS":
        return {
          data: await runAppleScript(
            `tell application "Orion" to return URL of front document`,
          ),
        };
      case "org.mozilla.firefox":
        return {
          data: await runAppleScript(`
          tell application "System Events"
            set firefox to application process "Firefox"
            get properties of firefox
            set frontWindow to front window of firefox
            set firstGroup to first group of frontWindow
            set navigation to toolbar "Navigation" of firstGroup
            get value of UI element 1 of combo box 1 of navigation
          end tell
        `),
        };
      default:
        break;
    }

    if (app?.name === "Vivaldi.app") {
      return {
        data: await runAppleScript(
          `tell application "Vivaldi" to return URL of active tab of front window`,
        ),
      };
    }

    throw new Error(`Unsupported App: ${app.name}`);
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
}
