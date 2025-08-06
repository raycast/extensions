import { BrowserExtension, Toast, environment, getFrontmostApplication, showToast } from "@raycast/api";
import { runAppleScript, usePromise } from "@raycast/utils";

/**
 * Custom hook to get the current URL from the active browser tab.
 *
 * This hook attempts to retrieve the URL using the following methods in order:
 * 1. Browser Extension API (if available) - preferred method
 * 2. AppleScript - fallback for supported browsers
 *
 * @returns {Promise<string>} The URL of the active browser tab
 * @throws {Error} If the browser is not supported or no active tab is found
 */
export function useBrowserLink() {
  return usePromise(
    async () => {
      // Check if Browser Extension API is available
      if (environment.canAccess(BrowserExtension)) {
        try {
          const tabs = await BrowserExtension.getTabs();
          // Find the active tab
          const activeTab = tabs.find((tab) => tab.active);

          if (activeTab && activeTab.url) {
            return activeTab.url;
          }

          // If no active tab found, return the first tab's URL
          if (tabs.length > 0 && tabs[0].url) {
            return tabs[0].url;
          }

          throw new Error("No active tab found");
        } catch (error) {
          // Fallback to AppleScript if Browser Extension API fails
          console.warn("Browser Extension API failed:", error);
        }
      }

      // Fallback: AppleScript-based processing
      const app = await getFrontmostApplication();

      switch (app.bundleId) {
        case "company.thebrowser.Browser":
          return runAppleScript(`tell application "Arc" to return URL of active tab of front window`);
        case "com.vivaldi.Vivaldi":
          return runAppleScript(`tell application "Vivaldi" to return URL of active tab of front window`);
        case "com.google.Chrome":
          return runAppleScript(`tell application "Google Chrome" to return URL of active tab of front window`);
        case "com.brave.Browser":
          return runAppleScript(`tell application "Brave Browser" to return URL of active tab of front window`);
        case "com.apple.Safari":
          return runAppleScript(`tell application "Safari" to return URL of front document`);
        case "com.kagi.kagimacOS":
          return runAppleScript(`tell application "Orion" to return URL of front document`);
        case "org.mozilla.firefox":
          return runAppleScript(`
            tell application "System Events"
              set firefox to application process "Firefox"

              -- HACK: It is important to get the list of UI elements; otherwise, we get an error
              get properties of firefox

              set frontWindow to front window of firefox
              set firstGroup to first group of frontWindow
              set navigation to toolbar "Navigation" of firstGroup
              get value of UI element 1 of combo box 1 of navigation
            end tell
          `);
        case "app.zen-browser.zen":
          return runAppleScript(`
            tell application "System Events"
                set zen to application process "Zen"

                get properties of zen

                set frontWindow to front window of zen
                set firstGroup to first group of frontWindow
                set navigation to toolbar "Navigation" of group 1 of group 1 of firstGroup
                get value of UI element 1 of combo box 1 of group 1 of navigation
            end tell
          `);
        default:
          break;
      }

      // Fallback for Vivaldi Browser not recognized by bundleId
      if (app?.name === "Vivaldi.app") {
        return runAppleScript(`tell application "Vivaldi" to return URL of active tab of front window`);
      }

      throw new Error(`Unsupported App: ${app.name}`);
    },
    [],
    {
      onError: (error) => {
        showToast(Toast.Style.Failure, error.message);
      },
    },
  );
}
