import { Toast, getFrontmostApplication, showToast } from "@raycast/api";
import { runAppleScript, usePromise } from "@raycast/utils";

export function useBrowserLink() {
  return usePromise(
    async () => {
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
